---
title: Alignment
readings:
  groups:
    - heading: The alignment principle
      items:
        - cite: davis2026mage
          locator: 'chap. 3 introduction, §§3.1–3.3.3, and §3.4'
          annotation: '{mage:3.1} and {mage:3.4} Davis, 2026. The chapter opening and §§3.1–3.3.3 establish the core Alignment argument: guidance versus enforcement, correspondence / conformance / acceptance, the earliest decidable boundary, the four control roles, and matching mechanisms to properties. §3.4 then shows how the governed environment changes through experience: failures expose missing controls, recurring judgments can undergo governance conversion, and accumulated controls become engineering capital. Read these sections before class so that the session can use the vocabulary to reason about concrete engineering situations rather than spending the session introducing it.'
    - heading: Place the check where the semantics exist
      items:
        - cite: saltzerreedclark1984e2e
          annotation: 'Saltzer, Reed, and Clark, ["End-to-End Arguments in System Design"](https://doi.org/10.1145/357401.357402) (1984). Chapter 3 acknowledges the connection explicitly. This classic systems argument — place a function where the semantics needed to decide it exist, not merely as early or as low as possible — is the placement rule in an older register. Read it asking which of the paper''s communication-system examples transfer to engineering checks, and what plays the role of the "ends" when the system is an engineering environment rather than a network.'
    - heading: Control as an engineering tradition
      items:
        - 'Works by Nancy Leveson, TODO.'
      note: 'The systems-safety and control tradition establishes that constraints plus evidence, and feedback plus intervention, are serious pre-agent engineering ideas rather than vocabulary invented for AI. The specific work and portion to assign are still being selected.'
    - heading: The organizational precedent
      items:
        - cite: simons1995control
          annotation: 'Simons, ["Control in an Age of Empowerment"](https://hbr.org/1995/03/control-in-an-age-of-empowerment) (1995). The organizational precedent. Management faced the delegation problem long before software agents existed: how to grant people real autonomy while keeping the organization''s consequential obligations intact. Simons'' answer is a designed system of controls, not more instruction — empowerment and control engineered together, the same pairing this unit makes of capability and authority. The reading also guards against a misreading: Alignment is not a distinctively AI-era invention.'
  optional:
    - cite: davis2026mage
      locator: '§§3.3.4–3.3.7 and §3.5'
      annotation: 'MAGE, Chapter 3, §§3.3.4–3.3.7 and {mage:3.5}. The later §3.3 sections elaborate mechanisms that land better after the walk from linter to CI to constraints to sanctioned paths — provenance-carried admission in particular is taught in class rather than required beforehand. §3.5 answers what happens after a hundred controls accumulate: the natural extension for an interested student, not required preparation.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: "Lecture slides — Alignment: From Guidance to Authority"
    src: 2-3-Alignment.pptx
---

**Premise.** *Guidance shapes behavior; enforcement determines what the environment accepts.*

Alignment connects the epistemology of Validation to the control problem of Delegation. Validation asked what evidence justifies engineering action. Delegation asked what consequences a capable but fallible agent should be authorized to produce. Alignment connects these questions: when an engineering obligation matters, how should evidence about that obligation govern what the engineered environment permits or accepts?

Software engineers already build this kind of control into their environments. A linter checks some properties while code is being written. A pre-commit hook can reject a change before it becomes a commit; a pre-push hook, before the work leaves the developer's machine. Continuous integration can evaluate the assembled change before merge. A deployment gate can inspect a release candidate before production accepts it. Runtime controls can restrict what the deployed system is permitted to do. These mechanisms operate at different boundaries because they can see different things: a linter may decide a property from one source file, an integration test may require the assembled system, and some properties become visible only after the system is running.

There is also a difference between asking for a property and checking it. A coding standard can tell an engineer not to introduce a forbidden dependency; an architectural check can reject that dependency. The first influences the producer. The second gives engineering knowledge consequences.

MAGE calls this broader practice Alignment: connecting engineering obligations to mechanisms that can constrain work, produce evidence, evaluate that evidence, and control what the environment accepts.

**Alignment Principle.** *Make engineering obligations enforceable by encoding them into mechanisms that constrain actions, produce evidence, evaluate that evidence, and control admission.*

## Check it where it can be decided

Consider the familiar progression: edit → commit → push → merge → deploy → runtime. Different checks attach to different points. Why not run every check as early as possible? Because some properties do not yet exist in a form that can be decided.

This gives us a placement rule: **check an obligation at the earliest boundary where you can actually decide it.** Earlier checks usually make failures cheaper to repair, but moving a check earlier than its evidence permits does not make the control stronger. It makes the check incapable of deciding the property it claims to enforce. The boundary follows the property.

## Guidance is not enforcement

Suppose an agent receives the instruction: *do not merge unless the security tests pass.* Placed in a prompt, project instructions, or a skill, this guidance may strongly influence behavior. But the reasoner can misunderstand it, forget it, or decide incorrectly that the condition has been satisfied. Connect the same condition to a merge gate and something different happens: the environment determines whether the merge proceeds.

Both are useful, and Alignment is not an argument against instructions, documentation, review, or expert judgment. It asks which engineering obligations matter enough, and are sufficiently evaluable, that satisfying them should not depend solely on each future producer remembering and interpreting them correctly.

## Four roles

Once the obligation and its boundary are known, we can ask what the environment should do. Four roles are useful:

- **Constraint** — narrows what may happen.
- **Sensor** — observes what happened and produces evidence.
- **Validator** — evaluates evidence against an obligation.
- **Gate** — controls whether work may cross a boundary.

## When failures become controls

Alignment also explains how an engineering environment changes over time. A failure may initially require diagnosis and judgment: an engineer discovers that a consequential obligation was absent, weakly represented, checked at the wrong boundary, or left to guidance when the environment could have enforced it.

When the same judgment is likely to matter again, the engineer can change the environment. A recurring review question becomes a validator. A convention becomes an architectural constraint. A remembered check becomes a gate. A known-dangerous operation disappears behind a sanctioned interface. MAGE calls this governance conversion: converting engineering knowledge acquired through experience into durable control.

The result has value beyond the individual failure that produced it. Future engineers and agents no longer need to reconstruct the same judgment from scratch, and the environment can prevent or reject whole classes of recurrence. These accumulated models, constraints, validators, gates, and sanctioned paths are a form of engineering capital: prior engineering judgment embedded in reusable structure.

But conversion is not automatic. Some failures expose obligations that remain difficult to represent or evaluate, and some judgments should remain judgments. The question is not "Can we add another gate?" It is whether a recurring engineering judgment can be represented faithfully enough, evaluated reliably enough, and placed at an appropriate boundary to deserve authority over future work.

## From engineering knowledge to engineering control

The three units now fit together. Agents asked how engineers delegate realization without delegating responsibility: BOUND → EQUIP → AUTHORIZE → VERIFY. Modeling asked how engineers preserve consequential distinctions while leaving irrelevant choices free, and how those purposeful reductions remain interpretable, connected, and correspondent to the system. Alignment asks what happens when some of that engineering knowledge must do more than inform the next reasoner: state the obligation, check it where it can actually be decided, choose an appropriate mechanism, and determine what happens when the check fails.

The environment does not remain fixed. Failures reveal what it does not yet know, see, evaluate, or enforce, and recurring judgments can sometimes be converted into durable control. The next unit, Failure-Aware Engineering, asks how to make that learning systematic.

The objective is not to eliminate engineering judgment. It is to decide where judgment should remain judgment, and where recurring judgment should become durable engineering structure. That is Alignment.
