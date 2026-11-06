---
title: "Technical Debt in Agentic Software Engineering"
readings:
  groups:
    - heading: Three forms of debt in the age of AI
      items:
        - cite: storey2026
          annotation: 'Storey, ["From Technical Debt to Cognitive and Intent Debt: Rethinking Software Health in the Age of AI"](https://queue.acm.org/doi/10.1145/3807966) (*ACM Queue* 24:2, June 2026). Read the whole article. Storey argues that two kinds of deterioration deserve names alongside technical debt rather than being folded into it: cognitive debt, the erosion of a team''s shared understanding of how its system works, and intent debt, the missing record of goals, constraints, and rationale that a later engineer or agent would need. The point to carry away is that the three reside in different places — the software, the people, the written record — and are therefore repaired by different work. Consider which of the three cheap agent-generated implementation grows fastest, and which of them your test suite can see at all.'
        - cite: tavantzis2026cognitivedebt
          locator: 'the findings on how cognitive debt manifests and what practitioners do about it'
          annotation: 'Tavantzis, Trinkenreich, Greiler, J. C. Araújo, M. C. Araújo, Santos, Serebrenik, Storey, and Baldassarre, ["Cognitive Debt in the GenAI Era: Listening to Practitioners'' Voices on the Loss of Understanding"](https://arxiv.org/abs/2610.37888) (preprint, 27 October 2026; under review at ICSE-SEIP). Read the findings on how cognitive debt manifests and what practitioners do about it; the method section is optional. Reviewing 76 grey-literature sources, the authors report that cognitive debt accumulates behind working code and passing tests, particularly where AI-generated changes are accepted without the reviewer developing enough understanding to predict their consequences. The contribution is empirical rather than conceptual: practitioners already describe this failure, and they describe it as surfacing only once something must be changed or explained.'
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
    - heading: Optional reference — the triple-debt argument in brief
      items:
        - cite: storey2026cognitivedebtessay
          annotation: 'Storey, ["How Generative and Agentic AI Shift Concern from Technical Debt to Cognitive Debt"](https://margaretstorey.com/blog/2026/02/09/cognitive-debt/) (February 2026). Optional. The shorter essay that precedes the *Queue* article, and the source of the student-team example this unit uses: a team that built software rapidly with AI and, several weeks later, could no longer explain why its design decisions had been made or how the parts were meant to work together. Read it if you want the argument before it was formalized into the triple-debt model.'
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
      separately deployed services — and you choose how many future changes to expect and whether
      laboratory changes must ship on their own. Two cost controls move independently: an
      implementation multiplier down to a hundredth, and a validation-and-integration level. The
      change scenario, the mix of future changes, and how many teams own booking policy are one
      disclosure away, under Further investigation. Commit a prediction for three conditions
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
exercises:
  - title: Restructure the reservation service?
    slug: restructure-or-not
    about: >
      Your agent produced a working reservation service with weak internal boundaries, and an
      implementation probe confirms that the laboratory-policy change requires modifying four of its
      five components. More policy changes arrive each semester. In pairs, give a first answer — retain
      the current structure, refactor to a modular monolith, or extract services — and argue it from
      the expected changes rather than from the disorder you can see. Then perturb the premises: only
      one further policy change is ever expected; a second team takes over approvals. Which answers
      change, and why? The unit prices the three options afterwards and returns to this answer, so the
      first one is meant to be superseded.
  - title: Respond to a vulnerable dependency
    slug: vulnerable-dependency
    about: |
      The HTTP parser two levels down the dependency tree carries a critical CVE, and upstream is
      unmaintained. Five responses are on the table, each charging a different price — upgrade to a
      patched fork or major version and pay the compatibility testing; pin and mitigate, documenting
      the exposure window and the compensating control; replace the parser or the framework that chose
      it and pay the migration; remove the feature that pulls it in; or fork and maintain it, which
      means staffing a parser. Decide what you do tonight and what you do by next semester.

      A critical CVE is not an exploit, so separate four questions before choosing. Is the vulnerable
      version present? Is the vulnerable functionality reachable from your deployment? Are the
      exploitation conditions satisfied? What is the consequence if it is exploited?
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
materials:
  - title: "Lecture slides — Technical Debt in Agentic Software Engineering"
    src: 3-3-Agentic-Technical-Debt-Architecture-and-Dependencies.pptx
---

**Premise.** *A working implementation is not necessarily one we understand, one whose reasons anyone recorded, or one we can safely change. Engineers must judge all three before they can say what the next change will cost.*

A coding agent can produce an application that satisfies its input/output specification, passes its tests, and runs in the intended environment. That is useful evidence about the implementation, and it settles less than it appears to. None of it establishes what the next consequential change will cost, or whether that change can be made safely. The question stays invisible until someone must make it.

Three different things can have deteriorated behind such a system, and only one of them is in the code. The structure may make changes more expensive than they need to be. The team's shared understanding of how the system works may have thinned to the point where nobody can predict what a change touches. And the goals, constraints, and rationale that a later engineer or a later agent would need may never have been written down. This unit separates the three, then recovers the models and collects the evidence each one needs.

## Structure of this unit

**Lecture: Technical Debt in Agentic Software Engineering.** *Understanding, architecture, and dependencies.* A single lecture in three movements. Technical debt, architecture, and dependency risk are longstanding engineering problems; coding agents change their economics and the circumstances under which they arise, not their nature. Throughout, we ask what models and evidence support a decision to retain, restructure, update, or replace part of a working system.

**Movement 1: Cognitive and intent debt.** *What do we understand about the software we obtained?* We adopt Storey's Triple Debt Model, separate deteriorating understanding from an unrecorded rationale, show that both survive a green test suite, and close by recovering an architecture — the first evidence in the unit that is not a passing test.

**Movement 2: Architectural technical debt.** *Can we afford the structure the agent chose?* We define architectural technical debt in the established sense, price a structural compromise before examining any pattern, then work through weak boundaries and erosion, change-impact analysis, the modular monolith against separately deployed services, and what must stay true during a restructuring.

**Movement 3: Dependency management and technical debt.** *What did we agree to maintain and trust?* We distinguish maintenance risk, security exposure, and distribution obligation from debt proper, then use dependency graphs, SBOMs, licenses, provenance, and vulnerability evidence to decide whether to retain, update, isolate, replace, or remove a component.

## Three forms of debt

Margaret-Anne Storey's Triple Debt Model names the three and says where each one lives. The distinction is the useful part: these are not three words for one kind of badness, and they are not repaired by the same work.

| Debt | Where it resides | What has deteriorated |
|---|---|---|
| Technical debt | The software | Structure and implementation choices that increase future engineering costs |
| Cognitive debt | The people who build it | Shared understanding of how the system works and how it can be changed |
| Intent debt | Externalized knowledge | Recorded goals, constraints, and rationale needed to understand and evolve the system |

Each can occur without the others. A system can have a clean architecture and substantial cognitive debt: nobody has left, and nobody can predict what a change will break. A system can be thoroughly documented and still carry heavy technical debt, because writing a compromise down does not make it cheap. And a team can understand a system perfectly while having recorded none of it, which is intent debt with no cognitive debt at all — until somebody leaves.

Storey's own example is a student team that built software rapidly with AI. By week eight simple changes had become unexpectedly difficult, and the team first blamed messy code. The investigation found something else: no one could explain why particular design decisions had been made, or how the parts were supposed to work together. The features still shipped and the tests still passed. A grey-literature study of 76 practitioner sources reports the same shape, with cognitive debt accumulating behind working software and passing tests, particularly where AI-generated changes are accepted without the reviewer developing enough understanding to predict their consequences.

The three debts call for three kinds of work, and the repairs do not substitute for one another.

| Debt | What would show it | What repairs it |
|---|---|---|
| Cognitive | Can engineers explain the structure and predict what a change touches? | Guided investigation, review that teaches, deliberate knowledge sharing |
| Intent | Are the consequential constraints and decisions recorded anywhere? | Models, decision records, specifications |
| Technical | Do structural compromises make the changes we expect more expensive? | Refactoring, restructuring, replacement |

Refactoring changes the code and leaves the team's understanding where it was, or worse, because the structure they half-understood has moved. Documentation records a decision and corrects no architecture. This is where models earn their place and also where the overclaim lies: a model of an obligation or a recorded decision is exactly the externalized knowledge intent debt is missing, so writing the architecture down reduces intent debt. It does not by itself reduce cognitive debt. **A model being available does not establish that any engineer understands it.** An accurate, current page nobody consults is not shared understanding.

There is a diagnostic asymmetry worth naming, because it explains why cognitive debt goes unmanaged. Technical debt leaves evidence in the artifact, so a tool can look for it. Cognitive debt leaves evidence only in what people can and cannot do, so the only probe is to ask them.

## Buying back the understanding

Of the three debts, only one leaves evidence a tool can read. The repair for the other two is investigation, and architecture recovery is the concrete form it takes: it produces understanding where there was none, and it produces an artifact that records what was found.

Consider the campus reservation service developed in the preceding units. It now has an execution environment, persistent storage, and a means of deploying updates. Suppose the university introduces laboratory reservations, which require different booking policies and approval procedures. The original application still works, but implementing the new requirement may reveal that reservation rules are scattered across HTTP handlers, database queries, and authorization checks.

An engineer examining an unfamiliar implementation can construct a dependency model showing which components use which others. The recovered model is an abstraction, constructed to answer a particular engineering question rather than to describe every implementation detail. Recovery becomes informative when that model is set against the structure the architecture intended.

![Two panels hold the same three components in the same positions. The INTENDED MODEL panel stacks HTTP handlers above booking policy above persistence, with one arrow from HTTP handlers down to booking policy and a second from booking policy down to persistence; its note reads that each dependency points one layer down and no layer is skipped. The IMPLEMENTATION panel repeats those three components and both of those arrows, and adds a third edge drawn in red: it leaves the right side of HTTP handlers, routes down around the booking policy layer, and enters persistence directly. That edge is labeled a forbidden dependency, because HTTP reaches persistence while skipping booking policy. A closing note reads that recovery produces the right-hand graph, and that comparing it with the intended model is what locates the departure, which either graph alone leaves invisible.](figures/recovering-architecture.svg)

Recovery answers what the structure *is*. It says nothing about what keeping it will cost, and the recovered model records no reasons: nobody has told us why the structure is like this, so the intent is still missing even once the understanding is bought.

## Architectural technical debt

The established term for the cost side is **architectural technical debt** (ATD): technical debt incurred in consequential architectural decisions — how the system is decomposed, what its interfaces are, which frameworks and technologies it rests on — choices that later become constraints on how the system can evolve. Verdecchia, Kruchten, Lago, and Malavolta develop the definition from interviews with software architects; Kruchten, Nord, and Ozkaya's *Managing Technical Debt*, written at Carnegie Mellon's Software Engineering Institute, is the practitioner treatment. ATD is more precise than "architecture and design debt," which blurs two scales; design debt stays a separate recognized category only where a treatment actually examines detailed design compromises, and this unit does not.

Three phrases carry the definition. *Consequential* narrows it to decisions that are expensive to revisit. *Decisions* locates the debt in a choice that could have gone otherwise, not in a file somebody dislikes. And *become constraints* is the mechanism: a decomposition chosen in week two is a constraint by year two, and the cost arrives when evolution meets it.

Two further conditions are routinely mistaken for this debt, and both are statements about structure rather than cost. A Big Ball of Mud is an implementation with few stable or comprehensible boundaries; Foote and Yoder describe how repeated local changes under schedule pressure produce one without anyone deciding on it. Architectural erosion is a relationship rather than a structure: the implementation increasingly violates boundaries an intended architecture established. A system can exhibit one without the other. Code written without a design cannot erode from it.

| Condition | What we observe | Model required | Engineering question |
|---|---|---|---|
| Big Ball of Mud | Weak or indiscernible boundaries | Recovered architecture | Is the structure adequate for the expected changes? |
| Architectural erosion | Divergence from intended boundaries | Intended and recovered architectures | Should we restore the intended boundaries or revise them? |

Neither condition is a verdict on the engineering. Each is a possible *symptom* of architectural technical debt, and an observation that a later economic judgment acts on.

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

## Dependency management and technical debt

An application's structure includes more than the code its developers wrote. Libraries, frameworks, runtimes, and build tools contribute functionality while introducing obligations nobody selected one at a time.

Before any of that is called debt, it is worth separating the several different things a dependency problem can be, because the responses differ.

| What we observe | What it is |
|---|---|
| The library is unmaintained | Maintenance risk |
| A vulnerability in it is reachable from our deployment | Security exposure |
| Its license restricts how we may distribute | Distribution obligation |
| It cannot be upgraded without substantial rework | Potential technical debt |
| The upgrade is postponed again while the migration grows | Dependency debt, accumulating |

Only the last two are debt. An obligation is something we owe; a debt is a cost we chose to defer. A currently reachable vulnerability is a problem to fix whatever we conclude about debt, and discharging a licensing obligation is not repayment. Dependency-related technical debt is the narrower thing: the cost attributable to deferred updates, avoidable coupling, and difficult replacement. Three parallel debt labels would be tidier than this table and would be wrong, which is why the unit does not force dependencies into the triple-debt model.

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

All three movements end in the same place: a model, and a decision the model does not make for us. An investigation reports what the team can and cannot explain, and a decision record reports what anybody bothered to write down. A recovered architecture reports where the coupling sits. A dependency inventory reports what we are carrying and from whom. None of them says whether to act, and that judgment is economic rather than structural.

The models differ according to the engineering question. Dependency graphs and change-impact measurements help evaluate architectural coupling. SBOMs, provenance records, vulnerability information, and license inventories help evaluate inherited components. Tests, architectural rules, dependency policies, and release gates can then preserve selected obligations as the system changes.

A working implementation establishes that selected behavior has been realized, not that the system can be safely changed. Tests and controls are what supply evidence that the obligations those models identify remain satisfied. The next unit examines whether the system also meets quantitative requirements under realistic workloads and failures.
