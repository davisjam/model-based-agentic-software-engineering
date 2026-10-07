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

That probability hides several different engineering problems. One useful factorization is:

> **p<sub>R</sub> = P(E | R) · P(I | E, R) · P(L | I, E, R)**

We will call this the Master Equation for Act II. It separates reliable realization into three questions: was the consequential intent encoded correctly, was it interpreted correctly, and was that interpretation realized successfully? The task *T*, reasoning model *M*, and harness *H* describe the surrounding conditions under which this realization occurs.

Act II uses this decomposition to organize four engineering problems:

| Unit | Engineering problem |
|---|---|
| **Delegation** | Design the work, capability, authority, and evidence around delegated realization |
| **Modeling** | Represent consequential knowledge so that it can be encoded and interpreted while leaving irrelevant realization choices free |
| **Alignment** | Give selected obligations authority independent of whether the producing reasoner gets them right |
| **Failure-Aware Engineering** | Use failures as evidence about what the engineering environment should change |

The progression is deliberate. Delegation defines the realization problem. Modeling improves the conditions under which realization occurs. Alignment governs selected consequences when realization is unacceptable. Failure-Aware Engineering uses the resulting evidence to change the models, controls, or assumptions that future work inherits.

The Master Equation is a conceptual model, not a claim that these probabilities can generally be measured precisely. Its factors are conditional rather than independent. In plain terms, success at each stage depends on what happened at the stages before it. As a result, what can be realized depends on what was interpreted, and what can be interpreted depends on what was encoded. The equation gives us a vocabulary for locating where reliable realization can fail and where engineering can intervene.

- **[Delegating to Software Agents: Old Problem, New Properties](01-delegation/index.md)** — how contemporary agentic systems work, and how to bound, equip, authorize, and verify delegated realization.
- **[Modeling: Purposeful Reduction · Degrees of Semantic Commitment](02-modeling/index.md)** (2 lectures) — how engineering knowledge is represented; what a representation must preserve; how models constrain realization without determining it; and how implementations and models correspond.
- **[Alignment: From Guidance to Authority](03-alignment/index.md)** — how selected obligations acquire authority beyond the producing reasoner's judgment, and how realizations are admitted, rejected, or constrained.
- **[Failure-Aware Engineering](04-failure-aware-engineering/index.md)** — what to learn when reality contradicts expectation, and how that evidence changes models, controls, the engineering environment, and the engineer.
