---
title: Security Engineering
sessions:
  - "Security I: Threat Modeling"
  - "Security II: Controls & Assurance"
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
---

*What can an adversary do, and which security properties must the system preserve?*

An adversary does not sample the input space uniformly. This unit builds a model of who might attack the service and what they could reach, then asks which defenses follow from that model and what evidence establishes that they work.

**Lecture 1: Threat Modeling.** Security changes the engineering assumptions by introducing adversaries who deliberately seek unwanted outcomes. We identify assets, adversaries, attack surfaces, trust boundaries, and security objectives, then construct a threat model of the reservation service. Authentication, authorization, and data integrity provide concrete concerns. The model is a purposeful reduction: it retains the actors, capabilities, and boundaries needed to reason about threats without attempting to describe the entire implementation.

**Lecture 2: Controls & Assurance.** We connect threats to defenses and evidence. Topics include least privilege, input validation, isolation, authorization policies, security testing, and the limits of automated checks. Agent-specific risks, particularly prompt injection and tool permissions, return to the Delegation unit's distinction between capability and authority. Students should understand how a security requirement becomes an enforced policy and what evidence can establish that a defense works under stated assumptions.

## Readings

*Readings forthcoming.*
