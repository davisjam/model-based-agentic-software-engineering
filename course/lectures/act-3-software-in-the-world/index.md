---
title: Act III — Engineering Software Systems
week:
mage_readings: []
objectives: []
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
materials:
  - title: "Act III kickoff slides"
    src: 3-0-Act-III-Kickoff.pptx
---

# Act III — Engineering Software Systems

*What must engineers understand and control as software systems grow, operate, and evolve?*

Acts I and II developed the engineering activities used to reason about software and the means of delegating its realization while retaining control. We now apply those ideas to the technical concerns that arise when a useful program becomes a software system. A program that works on a developer's laptop may still depend on unstated assumptions about its execution environment, data, dependencies, workload, and users. Those assumptions become engineering obligations when the program is deployed and changed.

We will use a small **campus room reservation service** throughout the act. Initially, the service lists rooms, creates reservations, and cancels them through an HTTP API. It runs as a simple application with in-memory state. Each unit introduces a new concern: where the service executes, how it preserves data, whether its architecture supports change, what it inherits from dependencies, how it behaves under load and failure, how adversaries might misuse it, and how operators know whether it is working. The purpose is to reason about one evolving system through different engineering models, not to build a large application in class.

The method remains consistent across subjects. For each concern, we identify **the engineering problem**, construct a **model** that preserves the relevant information, compare **design choices**, obtain **evidence** about their consequences, and decide what **controls** should preserve consequential obligations. Modeling makes selected properties available for reasoning; Alignment gives selected obligations authority through checks, constraints, and admission decisions. The same method applies to very different technical problems, but the models and evidence are specific to each problem.

| Unit | Engineering problem | Representative models and evidence |
| --- | --- | --- |
| [Compute Environments & Deployment](01-compute-environments-and-deployment/index.md) | Where does software run, and how does a tested implementation become running software? | Deployment topology, resource assumptions, pipelines, release strategies |
| [Data Management](02-data-management/index.md) | How does the system preserve information, and what does its database guarantee? | Relational schema, constraints, execution plans, transactions |
| [Agentic technical debt: Architecture and supply chains](03-technical-debt-architecture-and-supply-chains/index.md) | Can a useful implementation be changed economically, and what obligations has it inherited? | Dependency graphs, coupling and complexity measures, architectural patterns, SBOMs, license inventory |
| [Performance & Reliability](04-performance-and-reliability/index.md) | How does the system behave under workload and component failure? | Workload and capacity models, measurements, failure models, state machines |
| [Security Engineering](05-security-engineering/index.md) | What can an adversary do, and which security properties must the system preserve? | Threat models, trust boundaries, authorization policies, security tests |
| [Operations & SRE](06-operations-and-sre/index.md) | How can operators understand, recover, and learn from the running system? | SLOs, logs, metrics, traces, runbooks, incident records |
| [Course in Review: Engineering Controlled Change](07-engineering-controlled-change/index.md) | How do these technical concerns become a sustained engineering practice? | Joined models, evidence, controls, and change decisions |

The sequence follows the increasing obligations of a small application. We begin with its execution environment and persistent state. Next we examine its internal structure and inherited dependencies, then its behavior under load, failure, and attack. Finally, we consider how the running system is observed and maintained. The concluding unit connects these concerns to the course's definition of software engineering as controlled change.
