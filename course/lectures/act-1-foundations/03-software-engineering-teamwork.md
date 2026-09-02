---
title: Software Engineering Teamwork
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
    src: materials/1-3-SoftwareEngineeringTeamwork.pptx
---

**Premise.** *A software team is a system for coordinating engineering capability.*

Software engineering requires more than assembling capable individuals. As projects grow, engineers must divide work, maintain shared context, make compatible decisions, integrate changes, and detect when their understanding has diverged. These interactions create coordination costs: adding engineers adds capability, but also adds communication, dependencies, handoffs, and integration work. This is why engineering organizations do not scale linearly simply by adding people.

## A model of teamwork at several levels

This module develops a model for reasoning about teamwork at several levels:

- **Individuals contribute more than implementation.** Effective engineers learn, exercise judgment, adapt to changing conditions, understand the product and organization around them, communicate across differences in context, and help other engineers succeed.
- **Teams depend on shared context and trust.** Members must be able to rely on one another's information, surface uncertainty and mistakes, understand ownership and responsibilities, and construct sufficiently compatible views of the system and its goals.
- **Coordination has costs and failure modes.** More people create more potential communication paths and dependencies. Handoffs lose context; unclear ownership leaves work undone; incompatible assumptions create integration failures; and adding people to troubled work can increase rather than reduce the coordination burden.
- **Coordination can be engineered.** Architecture and decomposition reduce unnecessary dependencies. Meetings, communication conventions, ownership structures, project-management systems, Git workflows, code review, and automation provide mechanisms for coordinating the dependencies that remain. Global and follow-the-sun development make these problems especially visible because distance, time zones, and cultural differences make implicit context harder to preserve.

## GenAI and the team

GenAI changes this system in an important but ambiguous way. If AI acts as an amplifier of individual engineering capability, an engineer may be able to understand, modify, and own substantially more of a system. That can reduce some coordination needs. But greater individual throughput can also produce more changes, decisions, and artifacts for other people to understand, review, and integrate. Increasing the capability of the parts does not automatically increase the capability of the team.

The practical engineering question is therefore not simply *How do we make each engineer more productive?* It is also *How should work and communication be structured so that individual capability becomes reliable team capability?*

## The course project

The course project provides a small-scale opportunity to make these choices deliberately. Teams must coordinate internally while also coordinating with other teams in their pod. Their Team Contract can specify mechanisms for communication, ownership, meetings, work tracking, Git and review practices, and handling blockers. Teams may also designate—and potentially rotate—a pod point of contact, trading fewer cross-team communication paths against the risks of bottlenecks, handoffs, and concentrating context in one person.
