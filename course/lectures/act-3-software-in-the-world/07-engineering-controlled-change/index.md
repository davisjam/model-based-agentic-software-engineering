---
title: "Course in Review: Engineering Controlled Change"
readings:
  groups:
    - heading: Where engineering work moves
      items:
        - cite: davis2026mage
          locator: 'chap. 7, §7.1 The Reorganization of Software Work'
          annotation: '{mage:7.1} Davis, 2026. Required. The chapter argues that commodity intelligence changes software engineering''s cost structure rather than invalidating it: when implementation consumes less of the engineering budget, the relative value of specification, architecture, modeling, validation, measurement and governance rises. Read it for the distinction the lecture turns on, between accelerating the coding portion of the work and reorganizing the whole production process. Ask yourself which of your own project''s activities got cheaper this semester, and which got more consequential as a result.'
    - heading: What the engineer still owes
      items:
        - cite: davis2026mage
          locator: 'chap. 7, §7.4 The Engineer and §7.5 What Cannot Be Delegated?'
          annotation: '{mage:7.4} and {mage:7.5} Davis, 2026. Required. These two sections pose the question the final lecture closes on: if agents can implement changes, maintain models, run analyses and propose engineering moves, what remains the engineer''s work? The answer offered is not a list of tasks machines currently perform badly, because such lists expire. It is informed control and responsibility for what the system should mean. Read §7.5 last; it is the book''s coda and it states where the difficulty moves rather than claiming the difficulty disappears.'
  optional:
    - cite: davis2026mage
      locator: 'chap. 6, §6.1 A Theory of MAGE and §6.2 What the Theory Predicts'
      annotation: '{mage:6.1} and {mage:6.2} Davis, 2026. Optional. The economic argument underneath the lecture''s third and fourth sections: governance conversion, engineering capital, and why a change inherits the architecture, representations, conventions, obligations and tests that earlier work produced. §6.2 is the more useful of the two here, because it treats engineering capital as a quantity that can fail to materialize, and gives the conditions under which a conversion does not pay.'
    - cite: beyer2016sre
      locator: 'chapter 15, Postmortem Culture: Learning from Failure'
      annotation: 'Beyer, Jones, Petoff and Murphy (eds.), *Site Reliability Engineering* (O''Reilly, 2016), [chapter 15](https://sre.google/sre-book/postmortem-culture/). Optional, and carried over from Operations & SRE. Reread the section on corrective actions against this unit''s closing questions: it is the clearest short account of the difference between repairing one failure and changing the conditions that let its class recur.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
materials:
  - title: "Lecture slides — Course in Review: Engineering Controlled Change"
    src: 3-7-Engineering-Controlled-Change.pptx
---

**Premise.** *The activities of this course are not stages of a process; they are the standing obligations of an engineer who remains answerable for a system that keeps changing.*

The course opened with a claim about what makes software development an engineering discipline. Since then you have studied how engineers decide what software should do, how they delegate its realization without surrendering control, and what technical properties a deployed system must preserve. This unit brings those subjects together and then looks forward, because you are entering a profession whose means of production are changing while you train for it.

## The objects of our discipline

Three definitions have been in force since week one, reproduced here in the wording you first met.

> **Software.** Software is an expressive medium in which behavior is represented for execution by machines, including through both conventional instruction-based computation and machine reasoning.

> **Software engineering.** Software engineering is the engineering discipline of controlled change in software systems. It creates and evolves software while preserving sufficient control over the properties and consequences that matter.

> **Engineering.** Engineering is the discipline of exercising informed control over consequential systems and accepting responsibility for their outcomes. Engineers need not personally perform every act required to realize a system. They must retain sufficient command to understand and direct it, evaluate the evidence for its consequential properties, recognize when its assumptions fail, and intervene when necessary. They remain answerable for the consequential decisions made under their authority.

Read in order they establish a hierarchy: what we engineer, what software engineering does with it, and what makes the activity engineering at all. Nothing in the third definition requires you to write the code.

## One system, many engineering questions

Act III followed one campus room reservation service through the concerns that arrive when a useful program becomes a software system. Each unit asked a different question and built the representation needed to answer it.

| Unit | Engineering question | Representative model |
| --- | --- | --- |
| Compute Environments & Deployment | Where does the software run, and how does it get there? | Deployment topology, release pipeline |
| Data Management | How is information represented and preserved? | Relational schema, constraints, transactions |
| Architecture & Dependencies | How do components relate, and what constrains change? | Dependency graph, coupling measures |
| Performance & Reliability | How does the system behave under load and failure? | Workload model, failure model |
| Security Engineering | What may an adversary do? | Threat model, trust boundaries |
| Operations & SRE | How do operators understand and recover the running system? | Objectives, telemetry, incident records |

None of these describes the software completely. Their value comes from what each one leaves out.

Consider a change to the service: students may reserve a room for a recurring weekly meeting. It looks like a change to application behavior. It reaches five models.

- **Data.** How is a recurrence represented, and can the no-overlap invariant still be enforced where it was enforced before?
- **Architecture.** Which component owns recurrence rules, and which owns conflict detection?
- **Performance.** What additional work does conflict-checking a recurring series demand, and at what point in the request path?
- **Security.** Who may create, modify or cancel a series, as distinct from one of its occurrences?
- **Operations.** How would an operator detect a series that was accepted when it should have been refused?

The engineer decides which of those questions are consequential here, which models therefore need revision, and what evidence would establish that the changed system is still acceptable. That triage is the work. It is not a step that precedes the work.

![A tall central box labeled ONE SOFTWARE SYSTEM, sub-labeled the reservation service, stands between two columns of three panels. Each panel is joined to the central box by a solid line, because all six describe the same artifact. The left column holds the structural descriptions: DEPLOYMENT TOPOLOGY, sub-labeled where components execute; DATA SCHEMA, sub-labeled what is preserved; and DEPENDENCY GRAPH, sub-labeled what constrains change. The right column holds the behavioral and adversarial descriptions: WORKLOAD AND FAILURE, sub-labeled how it behaves under stress; THREAT MODEL, sub-labeled what an adversary may do; and OPERATIONAL OBJECTIVES, sub-labeled what counts as healthy. Beneath the central box a wide band in the warm qualifying color is labeled WHERE THEY OVERLAP THEY MUST AGREE, and notes that the models need not share a representation, only the things they both name: the same service, the same table, the same boundary. From that band a single arrow leads down to ENGINEERING DECISION, sub-labeled accept, revise, or reject. Two dashed edges in the invalid-state color run up the outside of each column, from DEPENDENCY GRAPH to DEPLOYMENT TOPOLOGY and from OPERATIONAL OBJECTIVES to WORKLOAD AND FAILURE; the legend names them drift, distinguishing them from the solid describes edges. Closing notes read that a model which has drifted still answers questions and answers them wrongly, and that two models disagreeing about a thing they both name is a finding about the system, not a formatting problem.](figures/models-of-one-system.svg)

Models also go stale, and a stale model is worse than a missing one because it still answers. The implementation changes and the architecture diagram does not. A migration changes the schema and a consumer still assumes the old shape. An objective survives the workload it was set against. Keeping consequential representations in correspondence with the system is engineering, not documentation.

## Engineering controlled change

The three acts examined different parts of one problem.

| Act | Central question | Contribution to controlled change |
| --- | --- | --- |
| I. Foundations | What should the software accomplish, and how do we reason about it? | Establishes what must be true |
| II. Engineering with Agents | How is realization delegated without surrendering control? | Organizes and governs delegated work |
| III. Engineering Software Systems | What must the resulting system preserve? | Holds consequential properties in an operating system |

The acts are not sequential phases. Their activities recur for as long as the system lives. An incident exposes a missing requirement. A measurement forces an architectural change. An agent finds a better design while implementing a feature. A security review decides that an interface everyone had accepted now needs restricting. What orders these activities is whatever you have just learned.

![Seven stages run down a single column. CHANGE REQUEST leads to ENGINEERING JUDGMENT, sub-labeled which questions are consequential here, which leads to MODELS AND OBLIGATIONS, sub-labeled what knowledge must be made explicit, which leads to REALIZATION, sub-labeled a human or an agent performs the work. REALIZATION is the one box drawn in the warm color rather than the blue of the others, because it is the stage that may be delegated; every other stage is the engineer's. REALIZATION leads to EVIDENCE, sub-labeled what the change actually produced, which leads to ENGINEERING DECISION, sub-labeled accept, revise, or reject, which leads to RUNNING SYSTEM, sub-labeled serving real users. Two return edges close the loop and differ in reach. A short dashed edge on the right runs from EVIDENCE back up to REALIZATION, labeled revise and re-realize, for when the evidence rejects the work rather than the design. A long dashed edge on the left leaves RUNNING SYSTEM, runs out to the left margin, up the height of the figure, and re-enters MODELS AND OBLIGATIONS, labeled observation revises the models, obligations and controls, because what the running system teaches changes what the next change will be directed through. A legend distinguishes the engineer's stages from the delegable one and the two returns from the forward sequence. Closing notes read that the effort spent on each stage should follow the consequences of the decision, that for many changes the modeling stage is correctly almost empty, and that only the long return changes what the next change will inherit.](figures/engineering-controlled-change.svg)

This is an account of how the activities relate, not a workflow to follow. Many changes deserve almost no explicit modeling. A few deserve analysis, independent validation and a carefully staged deployment. Judging that proportion is itself an engineering decision you will be held to.

**Engineering capability accumulates.** An organization holds more than its source code. It holds knowledge of the system, the means to reason about a proposed change, and mechanisms that hold the properties it cares about. Some of that stays in people. Some becomes durable structure: models, tests, validators, architectural boundaries, runbooks.

Durable structure becomes engineering capital when later work inherits the judgment rather than reconstructing it. A regression test retires one defect permanently. A dependency model makes impact analysis cheap. A deployment gate carries an operational obligation across every future release. None of it is free: models drift, tests go obsolete, and controls interfere with each other. Keep the ones whose continuing value covers their cost.

## The changing work of software engineers

Software engineering has been reorganized before, each time by something that made one activity cheap. Compilers removed the need to write machine instructions. Libraries, frameworks and cloud platforms turned whole implementation and operational capabilities into services somebody else runs.

Coding agents belong to that history, with a broader reach. They participate in activities that previously required human interpretation: reading a repository, proposing a design, implementing a change, constructing tests, diagnosing a failure, revising an implementation against evidence. The consequence is not that programmers type less. As implementation gets cheaper, every other constraint on engineering gets relatively more expensive.

| Engineering activity | Effect of cheaper implementation | The question that remains yours |
| --- | --- | --- |
| Requirements | More alternatives can be explored | Which problem should be solved? |
| Design | Alternatives can be realized and compared | Which tradeoffs are acceptable? |
| Implementation | Most realization can be delegated | What freedom should the implementer have? |
| Validation | Tests and analyses are cheap to generate | What evidence establishes correctness? |
| Maintenance | Changes are produced rapidly | What must remain true across them? |
| Operations | Diagnosis and recovery are increasingly assisted | Which actions are safe and authorized? |

The right column is not a list of things machines cannot do. Agents may come to do much of the modeling, analysis and validation as well, and there is no principled reason to assume otherwise. The column records where the consequence of being wrong currently lands.

**More implementation is not more engineering.** Suppose your team can now produce ten times as many changes. If its capacity to understand, evaluate, integrate and operate them has not moved, the extra output buys little. The bottleneck relocated; it did not disappear. An organization that notices this invests in the system through which software is produced: better representations, stronger automated checks, integration that holds, operational mechanisms that remove repeated human intervention. Those investments raise how much work the organization can *govern*, which is a different quantity from how much code it can write.

## What remains the engineer's responsibility?

Delegation is not new to engineering. Engineers have always relied on other people, specialized tools, suppliers and automatic machinery to realize what they designed. Agents widen the range of what can be delegated. They do not transfer the authority or the responsibility that attaches to an engineering decision.

An engineer answerable for a consequential system keeps enough control to answer five questions.

1. **Intent.** What is the system supposed to accomplish?
2. **Knowledge.** What must be understood about it to decide responsibly?
3. **Evidence.** What would justify believing a proposed change is acceptable?
4. **Control.** Which obligations must be preserved, and what enforces them?
5. **Responsibility.** Who is answerable for the decision and its consequences?

Answering these does not require performing every task yourself. It requires knowing what you delegated, what remains uncertain, and when to intervene. Nor does it mean settling everything in advance. Good engineering preserves legitimate freedom: an implementer may choose among many acceptable realizations, and an experiment sometimes finds a better answer than the one you specified. Your task is to tell acceptable freedom apart from consequential uncertainty, and to say which one you were relying on.

So, returning to the definition in force since week one:

> Software engineering is the engineering discipline of controlled change in software systems. It creates and evolves software while preserving sufficient control over the properties and consequences that matter.

Four of its terms now carry the semester's weight. **Controlled** does not mean prevented; it means subject to informed judgment, with the evidence to back it. **Change** is the normal condition of software, not an exception to be managed. **Properties** are the things you decided must stay true, which is why you had to make them explicit. **Consequences** reach past the system to the people who depend on it, and they are what responsibility attaches to.

The means of producing software will keep changing. The obligation to understand and govern what it does will not.

## Closing questions

Bring your semester project.

1. Which engineering models would another team need in order to maintain your system responsibly?
2. Which of your important properties does your engineering environment enforce, and which still rest on someone remembering?
3. What has your team accumulated that would make the next change easier than the last one?
4. If agents became ten times more capable, what would change about your process, and what would still be yours?

Answer the fourth question twice. The second time, ask whether you are keeping each task because human judgment is genuinely required, or because you are used to a human doing it. Telling those apart is the last thing this course asks of you, and you will keep answering it long after the course ends.
