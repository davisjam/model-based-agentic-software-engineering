---
title: Teamwork
readings:
  groups:
    - heading: Teamwork
      items:
        - 'The Mythical Man-Month, Ch. 2. Discusses the nonlinear scaling of teamwork.'
        - 'Software Engineering at Google, Ch. 2, "How to Work Well on Teams."'
    - heading: Engineering work
      items:
        - '{mage:7.1} Davis, 2026. How increasingly capable agents change the distribution of work in software engineering, shifting human attention toward intent, abstraction, evidence, coordination, judgment, and acceptance.'
        - '{mage:7.3} Davis, 2026. What does it mean to be a software engineer when machines can perform increasing amounts of engineering work? The durable role of the engineer lies not in whatever tasks machines currently cannot perform, but in responsibility for what systems should mean, what evidence is sufficient, and what tradeoffs are acceptable.'
    - heading: Metrics
      items:
        - 'Software Engineering at Google, Ch. 7, "Measuring Engineering Productivity."'
        - '[DORA Metrics](https://dora.dev/guides/dora-metrics/). A widely used framework for measuring software delivery performance.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: Lecture slides — Software engineering teamwork
    src: slides/1-3-SoftwareEngineeringTeamwork.pptx
---

**Premise.** *A software team is a system for coordinating engineering capability.*

Software engineering requires more than assembling capable individuals. As projects grow, engineers must divide work, maintain shared context, make compatible decisions, integrate changes, and detect when their understanding has diverged. These interactions create **coordination costs**: adding engineers adds capability, but also adds communication, dependencies, handoffs, and integration work. This is why engineering organizations do not scale linearly simply by adding people. The engineering problem is therefore not simply how to make individuals productive. It is how to combine, allocate, and develop capability so that the team can accomplish more than its members could separately, without allowing the coordination required to consume the benefit.

## A model of teamwork at several levels

This module develops a model for reasoning about teamwork at several levels:

- **Individuals contribute more than implementation.** Effective engineers learn, exercise judgment, adapt to changing conditions, understand the product and organization around them, communicate across differences in context, and help other engineers succeed.
- **Teams depend on shared context and trust.** Members must be able to rely on one another's information, surface uncertainty and mistakes, understand ownership and responsibilities, and construct sufficiently compatible views of the system and its goals.
- **Coordination has costs and failure modes.** More people create more potential communication paths and dependencies. Handoffs lose context; unclear ownership leaves work undone; incompatible assumptions create integration failures; and adding people to troubled work can increase rather than reduce the coordination burden.
- **Coordination can be engineered.** Architecture and decomposition reduce unnecessary dependencies. Meetings, communication conventions, ownership structures, project-management systems, Git workflows, code review, and automation provide mechanisms for coordinating the dependencies that remain. Global and follow-the-sun development make these problems especially visible because distance, time zones, and cultural differences make implicit context harder to preserve.

## Capability also has to be allocated

Coordination asks how several engineers can combine their capabilities effectively. A team faces another problem as well: *where should its capability go?*

Assigning work does more than determine who produces today's artifact. Work also changes the people who perform it. An experienced engineer who handles every database problem may complete each one quickly, but the team can become increasingly dependent on that engineer. Giving some of that work to another engineer may cost more today while developing capability the team will need tomorrow.

This gives us a second question: *What should this work accomplish now, and what should it leave the team able to do next?*

**Mentorship**, **specialization**, **rotation**, and **delegation** are alternatives for answering that question, not practices that are automatically good. Specialization can make today's work efficient while concentrating knowledge. Rotation can spread knowledge while sacrificing expertise and imposing handoff costs. Pairing can develop capability while consuming the attention of two engineers.

Engineering management is therefore part of the teamwork problem. It allocates, sustains, and develops engineering capability over time. The fastest assignment may be the right one, especially when the immediate consequences are urgent. But when alternatives are available, engineers should also ask what expertise an assignment develops, what scarce capability it consumes, what dependency it creates, and what happens if the person receiving the work later becomes unavailable.

## GenAI and the team

GenAI changes both sides of this model. If AI amplifies individual engineering capability, one engineer may be able to understand, modify, and own substantially more of a system. Work that previously required several people may require fewer handoffs and dependencies. But greater individual throughput can also produce more changes, decisions, and artifacts for other people to understand, review, and integrate. Increasing the capability of the parts does not automatically increase the capability of the team.

GenAI also changes the allocation problem. Machine capability can often be purchased and replicated much more readily than accumulated human expertise. A task performed by an agent may be cheaper today than the same task performed by a junior engineer, but the alternatives leave the organization differently prepared for tomorrow. If implementation work helped engineers acquire system knowledge and judgment, automating all of it may remove part of the path by which future expertise develops.

The relevant questions are therefore not merely *How much more can each engineer produce?* They are *How does amplified individual capability change the interactions the team requires?* and *Which capabilities should we buy, which should we develop, and which assignments will produce them?*

## The course project

The course project provides a small-scale opportunity to make these choices deliberately. Teams must coordinate internally while also coordinating with other teams in their pod. Their Team Contract can specify mechanisms for communication, ownership, meetings, work tracking, Git and review practices, and handling blockers. Teams may also designate—and potentially rotate—a pod point of contact, trading fewer cross-team communication paths against the risks of bottlenecks, handoffs, and concentrating context in one person.

---

**Read the expanded treatment:** [*The Software Engineering Handbook*, "Teamwork" →](https://davisjam.github.io/model-based-agentic-software-engineering/book/se-handbook/02-teamwork.html)
