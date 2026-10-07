---
title: Act II — Delegation and Control
week:
mage_readings: []
objectives: []
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
---


# Act II — Delegation and Control

*How do we delegate realization, preserve what matters, govern what is produced, and learn when reality contradicts our expectations?*

Act II turns from the structures used to reason about software to the work of realizing systems, and to the problem of retaining control over that work when an engineer does not perform it personally. We begin with capable software agents and the familiar engineering problem of delegation: bounding work, equipping a delegate, granting authority, and obtaining evidence about the result.

The rest of the Act develops a model of what happens inside that delegation. For a task *T*, reasoning model *M*, representation *R*, and surrounding harness and process *H*, we can ask about the probability that one attempt produces an acceptable realization:

> **p(T, M, R, H)**

That probability hides several different engineering problems. Did the representation correctly encode what mattered? Did the reasoner correctly interpret it? Did the resulting implementation correctly realize it?

> **p<sub>R</sub> = P(E | R) · P(I | E, R) · P(L | I, E, R)**

Act II works through this system. Modeling asks what should be represented, what distinctions the representation must preserve, and what freedom it should leave to realization. Alignment asks which obligations should be enforced independently of whether the producing reasoner gets them right. Failure-Aware Engineering asks how the engineering environment should change when reality reveals that its models, controls, or assumptions were inadequate.

- **[Delegating to Software Agents: Old Problem, New Properties](01-delegation/index.md)** — how contemporary agentic systems work, and how to bound, equip, authorize, and verify delegated realization.
- **[Modeling: Representation & Implementation](02-modeling/index.md)** (2 lectures) — how engineering knowledge is represented; what a representation must preserve; how models constrain realization without determining it; and how implementations and models correspond.
- **[Alignment: From Guidance to Authority](03-alignment/index.md)** — how selected obligations acquire authority beyond the producing reasoner's judgment, and how realizations are admitted, rejected, or constrained.
- **[Failure-Aware Engineering](04-failure-aware-engineering/index.md)** — what to learn when reality contradicts expectation, and how that evidence changes models, controls, the engineering environment, and the engineer.
