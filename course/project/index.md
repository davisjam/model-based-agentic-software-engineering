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

The flagship project (initial instance: **ECE 30861**) walks a team through the full educational arc of engineering under an external obligation:

**ambiguous external obligation → interpretation → scoping/specification → design/build → validation → assurance → shipped system.**

Teams work in **pods**: teams assigned the same regulation share one specification, implement it independently, and **cross-test** one another's systems. See **[Assessment](assessment.md)**.

The **project overview slides** (the first-day framing for the ECE 30861 instance) are attached below — the editable PowerPoint source, offered as a download. The written phase guides (Phases 0–6, candidate projects, pods) still populate from here as they land.

## Overview

The goal of this project is to give you experience engineering software when the problem itself is not fully specified. This is exactly the kind of problem for which software engineering is needed: there is no complete specification to implement, and coding agents alone cannot determine what should be built.

You will work in teams of 3–5 students (default size is 4).

Your team will begin with a recent regulation. A list of candidate regulations is provided. You will study the regulation, identify a problem that software could address, determine what the software should do, scope a feasible project, design and implement it, and establish evidence that it works as intended.

Teams addressing the same regulation will be grouped into pods. Pods provide opportunities to compare interpretations, critique designs, and test systems developed independently from the same regulatory starting point.

Generative AI and software agents are part of the engineering environment for this project. They substantially increase your implementation capacity, placing greater importance on the decisions that guide that capacity. Your team will translate ambiguous real-world obligations into engineering requirements, make and justify tradeoffs, choose appropriate representations and mechanisms, and determine what evidence is sufficient to support confidence in the resulting system.

## Goals and Learning Objectives

By the end of the project, you should have:

1. Experience carrying an ambiguous real-world problem through the full engineering process: interpret, scope, design, build, validate, and ship.
2. Experience working on a software team.
3. Experience leveraging Generative AI as an engineering tool.
4. A working prototype with the potential to develop into a real product or business.

## Phases

The project is organized into seven phases. Phases 0–2 are specified by the instructors. In Phases 3–5, your team will define its own milestones based on the project you have scoped.

- **Phase 0** — Form a team and select a regulation. Communicate with us your project partner preferences (pairs of 2 or teams of 4), and indicate your regulatory preferences and LLM license capacity. As needed, you will be assigned additional partners, as well as to a pod with other teams working on the same regulation.
- **Phase 1** — Understand the problem in sync with your pod. Study the regulation, investigate the problem space, identify stakeholders and opportunities for software, and develop candidate project concepts with your pod.
- **Phase 2** — Scope and design the project in sync with your pod. Working with your pod, converge on a common problem and system scope that every team in the pod will independently implement. Establish shared requirements, interfaces, and success criteria sufficient to make the resulting systems independently testable against one another. Each team will then make its own design and implementation decisions and develop a feasible plan for the remainder of the semester.
- **Phase 3** — Team-defined milestone. Define and complete a meaningful engineering milestone appropriate to your project.
- **Phase 4** — Team-defined milestone. Define and complete the next meaningful engineering milestone, incorporating evidence and feedback from your work so far.
- **Phase 5** — Team-defined milestone. Define and complete your final development milestone, including appropriate automated testing and validation.
- **Phase 6** — Ship and demonstrate. Deliver the completed prototype, demonstrate what it does, present evidence supporting its quality, and reflect on the engineering decisions that produced it.

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
