---
id: teamwork
title: Software Engineering Teamwork
short_title: Teamwork
order: 2
status: draft
description: >
  A software team is a system for coordinating engineering capability. Adding people adds capability
  but also adds coordination cost, so teamwork must be engineered rather than assumed.
objectives:
  - Explain why engineering capacity does not scale linearly with team size.
  - Identify the coordination costs and failure modes that grow with a team.
  - Describe how coordination can be engineered rather than left implicit.
---

**Premise.** *A software team is a system for coordinating engineering capability.*

Software engineering requires more than assembling capable individuals. As projects grow, engineers
must divide work, maintain shared context, make compatible decisions, integrate changes, and detect
when their understanding has diverged.

::: {.definition #def-coordination-cost title="Coordination cost"}
Coordination cost is the communication, dependency, handoff, and integration work that team members
incur to keep their contributions compatible. Adding engineers adds capability, but it also adds
coordination cost — which is why engineering organizations do not scale linearly simply by adding
people.
:::

## A model of teamwork at several levels

Teamwork can be reasoned about at several levels.

- **Individuals contribute more than implementation.** Effective engineers learn, exercise judgment,
  adapt to changing conditions, understand the product and organization around them, communicate
  across differences in context, and help other engineers succeed.
- **Teams depend on shared context and trust.** Members must be able to rely on one another's
  information, surface uncertainty and mistakes, understand ownership and responsibilities, and
  construct sufficiently compatible views of the system and its goals.
- **Coordination has costs and failure modes.** More people create more potential communication paths
  and dependencies. Handoffs lose context; unclear ownership leaves work undone; incompatible
  assumptions create integration failures; and adding people to troubled work can increase rather than
  reduce the coordination burden.
- **Coordination can be engineered.** Architecture and decomposition — the subject of @ch-architecture
  — reduce unnecessary dependencies. Meetings, communication conventions, ownership structures,
  project-management systems, version-control workflows, code review, and automation provide
  mechanisms for coordinating the dependencies that remain. Global and follow-the-sun development make
  these problems especially visible, because distance, time zones, and cultural differences make
  implicit context harder to preserve.

## GenAI and the team

GenAI changes this system in an important but ambiguous way. If AI acts as an amplifier of individual
engineering capability, an engineer may be able to understand, modify, and own substantially more of
a system. That can reduce some coordination needs. But greater individual throughput can also produce
more changes, decisions, and artifacts for other people to understand, review, and integrate.
Increasing the capability of the parts does not automatically increase the capability of the team.

The practical engineering question is therefore not simply *how do we make each engineer more
productive?* It is also *how should work and communication be structured so that individual capability
becomes reliable team capability?*
