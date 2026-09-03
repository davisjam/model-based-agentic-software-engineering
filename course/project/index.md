---
title: Semester Project — Overview
week:
mage_readings: []
objectives: []
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
materials:
  - title: Project overview slides (ECE 30861)
    src: materials/Purdue-ECE-30861-Project_Overview.pptx
---

The semester project takes a team from an external obligation to a shipped software system:

**obligation → interpretation → specification → design → realization → validation → assurance → shipment**

Teams working from the same regulation form a **pod**. They share a specification, implement it independently, and **cross-test** their systems. See **[Project Assessment](../assessment/project-assessment.md)**.

The project gives you experience engineering software when the problem itself is not fully specified. This is exactly the kind of problem for which software engineering is needed: there is no complete specification to implement, and coding agents alone cannot determine what should be built.

You will work in teams of 3–5 students (default size is 4).

Your team will begin with a recent regulation. A list of candidate regulations is provided. You will study the regulation, identify a problem that software could address, determine what the software should do, scope a feasible project, design and implement it, and establish evidence that it works as intended.

Teams addressing the same regulation will be grouped into pods. Pods provide opportunities to compare interpretations, critique designs, and test systems developed independently from the same regulatory starting point.

Generative AI and software agents are part of the engineering environment for this project. They substantially increase your implementation capacity, placing greater importance on the decisions that guide that capacity. Your team will translate ambiguous real-world obligations into engineering requirements, make and justify tradeoffs, choose appropriate representations and mechanisms, and determine what evidence is sufficient to support confidence in the resulting system.

## Project goals

The project gives students experience:

- carrying an ambiguous external obligation through the software engineering lifecycle;
- working in a software team;
- using GenAI throughout engineering work; and
- building and defending a working software system.

## Phases

The project is organized into seven phases. Phases 0–2 are specified by the instructors. In Phases 3–5, your team will define its own milestones based on the project you have scoped.

- **Phase 0** — Form a team and select a regulation. Communicate with us your project partner preferences (pairs of 2 or teams of 4), and indicate your regulatory preferences and LLM license capacity. As needed, you will be assigned additional partners, as well as to a pod with other teams working on the same regulation.
- **Phase 1** — Understand the problem in sync with your pod. Study the regulation, investigate the problem space, identify stakeholders and opportunities for software, and develop candidate project concepts with your pod.
- **Phase 2** — Scope and design the project in sync with your pod. Working with your pod, converge on a common problem and system scope that every team in the pod will independently implement. Establish shared requirements, interfaces, and success criteria sufficient to make the resulting systems independently testable against one another. Each team will then make its own design and implementation decisions and develop a feasible plan for the remainder of the semester.
- **Phase 3** — Team-defined milestone. Define and complete a meaningful engineering milestone appropriate to your project.
- **Phase 4** — Team-defined milestone. Define and complete the next meaningful engineering milestone, incorporating evidence and feedback from your work so far.
- **Phase 5** — Team-defined milestone. Define and complete your final development milestone, including appropriate automated testing and validation.
- **Phase 6** — Ship and demonstrate. Deliver the completed prototype, demonstrate what it does, present evidence supporting its quality, and reflect on the engineering decisions that produced it.

## Project schedule

The reference course schedules the project across the semester as follows:

| Week | Project milestone |
|---|---|
| 1 | Phase 0: Team formation and regulation selection |
| 2 | Phase 1: Study & Scoping begins |
| 3 | Phase 1 due: Requirements, feasible scope, and problem analysis |
| 4 | Phase 2: Specification & Planning begins |
| 5 | Phase 2 due: Shared specification, validation targets, and implementation plan |
| 6 | Phase 3 begins |
| 8 | Phase 3 due: Milestone delivery and test run |
| 9 | Phase 4 begins |
| 10 | Phase 4 due: Milestone delivery and test run |
| 11 | Phase 5 begins |
| 13 | Phase 5 due: Milestone delivery and test run |
| 14 | Phase 6 begins |
| 16 | Phase 6 due: Final system and documentation |

Phases 3–5 are team-defined. Each team chooses milestones appropriate to its project while following the common delivery cadence.

## Deliverables and Assessments

### Deliverables

Teams will produce a collection of engineering artifacts appropriate to their project, including:

1. Software artifacts
    1. System specification as models
    2. A working implementation realizing their specification
    3. Automated validation, including static and dynamic tests
2. Documentation
    1. Design documents
    2. Assurance cases
        1. Regulatory compliance
        2. Cybersecurity

The specific artifacts will develop over the course of the project and will depend in part on the project your team chooses to pursue.

### Assessment

The team will be assessed based on the quality of its deliverables.

Team members will typically receive the same grade on:

- Software artifacts
- Reports

Team members will receive individual grades on the two oral exams associated with the project.

A portion of the project grade will be based on automated dynamic testing within your pod. This will assess:

- **Your tests on your system:** the quality and effectiveness of the tests your team develops.
- **Your tests on other systems:** how effectively your tests exercise and identify problems in your podmates' systems.
- **Other teams' tests on your system:** how well your system performs when tested independently by your podmates.

This structure rewards both building a system that works and developing tests capable of evaluating independent implementations of the same specification.
