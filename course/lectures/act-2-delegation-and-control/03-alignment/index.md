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
        - cite: leveson2003stamp
          annotation: 'Leveson, Daouk, Dulac, and Marais, ["Applying STAMP in Accident Analysis"](readings/leveson-stamp-accident-analysis-2003.pdf) (2003). STAMP treats an accident as the failure of a control structure rather than a chain of component faults: safety constraints are enforced by controllers that hold a model of the process they govern, and accidents follow when that control structure is inadequate or the controller''s model drifts from the system it governs. Read it for the shape of the argument -- constraints and evidence, feedback and intervention -- which is the shape Alignment gives to delegated work, arrived at decades before agents.'
      note: 'The systems-safety and control tradition establishes that constraints plus evidence, and feedback plus intervention, are serious pre-agent engineering ideas rather than vocabulary invented for AI.'
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
  - title: "Lecture slides — Alignment"
    src: 2-3-Alignment.pptx
---

**Premise.** *Alignment governs delegated work against the engineer's obligations.*

The previous units established two parts of this problem. Validation asked what evidence justifies an engineering judgment. Delegation asked what work and authority an engineer gives to another actor. Alignment asks how engineering obligations govern that delegated work: what the actor may do, what evidence the environment should collect, how that evidence should be evaluated, and what consequences should follow.

Software engineers already build this kind of control into their environments. A linter checks some properties while code is being written. A pre-commit hook can reject a change before it becomes a commit; a pre-push hook, before the work leaves the developer's machine. Continuous integration can evaluate the assembled change before merge. A deployment gate can inspect a release candidate before production accepts it. Runtime controls can restrict what the deployed system is permitted to do. These mechanisms operate at different boundaries because they can see different things: a linter may decide a property from one source file, an integration test may require the assembled system, and some properties become visible only after the system is running.

There is also a difference between asking for a property and checking it. A coding standard can tell an engineer not to introduce a forbidden dependency; an architectural check can reject that dependency. Only the check gives the obligation a consequence.

MAGE calls this broader practice Alignment: governing delegated work against the engineer's obligations.

**Alignment Principle.** Connect engineering obligations to mechanisms that constrain actions, produce evidence, evaluate that evidence, and, where appropriate, control admission.

## Guidance is not enforcement

Suppose an agent receives the instruction: do not merge unless the security tests pass. Placed in a prompt, project instructions, or a skill, this guidance may strongly influence behavior. But the reasoner can misunderstand it, forget it, or decide incorrectly that the condition has been satisfied. Connect the same condition to a merge gate and something different happens: the environment determines whether the merge proceeds.

Both are useful. Alignment asks which obligations matter enough, and can be evaluated reliably enough, that satisfying them should not depend solely on each future producer remembering and interpreting them correctly.

## The Master Equation

The Master Equation separates places where reliable delegated realization can fail.

> **p<sub>R</sub> = P(E | R) · P(I | E, R) · P(L | I, E, R)**

Modeling improves the conditions under which delegated realization succeeds. Alignment begins from the complementary fact that no factor in the Master Equation is generally one: which obligations should remain governed when realization fails?

| Factor | The Alignment question |
|---|---|
| *P(E \| R)* | Is the obligation represented clearly enough to be encoded as intended? |
| *P(I \| E, R)* | Which obligations should not depend solely on the producer interpreting them correctly? |
| *P(L \| I, E, R)* | What evidence distinguishes an acceptable realization from an unacceptable one? |

Alignment adds a surrounding engineering question: what should the harness *H* do with that evidence? Constraints, sensors, validators, and gates can prevent, observe, evaluate, or control consequences.

Each factor can be improved; none can be driven to one. Alignment therefore does not try to perfect the chain. It selects obligations that must hold even when a link fails, and backs them with mechanisms that do not depend on the producing reasoner getting them right. Modeling can improve the probability of satisfactory realization. Alignment asks what an unacceptable realization is allowed to cause. The engineering question is which obligations merit that treatment and where the evidence needed to decide them exists.

## Check it where it can be decided

Once an obligation should be checked independently, the next question is where. Consider the familiar progression: edit → commit → push → merge → deploy → runtime. Different checks attach to different points. Why not run every check as early as possible? Because some properties do not yet exist in a form that can be decided.

This gives us a placement rule: check an obligation at the earliest boundary where you can actually decide it. Earlier checks usually make failures cheaper to repair, but a check cannot establish an obligation before the required evidence exists. The boundary follows the property.

Modeling asks for the reduction in which the property becomes answerable. Alignment asks for the boundary at which the obligation becomes decidable.

## Agreement is not correctness

Alignment requires an obligation against which the work can be wrong. Correspondence asks whether two representations agree; conformance asks whether an artifact satisfies an independent obligation; acceptance asks whether the receiving environment accepts it. Evidence for one does not establish the others. A model derived perfectly from an implementation can correspond to that implementation while both violate the requirement that matters.

## Four roles

Once the obligation and its boundary are known, we can ask what the environment should do. Four roles are useful:

- **Constraint** — narrows what may happen.
- **Sensor** — observes what happened and produces evidence.
- **Validator** — evaluates evidence against an obligation.
- **Gate** — controls whether work may cross a boundary.

These are roles, not four separate tools or four sequential stages. A CI test can sense behavior, validate the result, and gate the build; a narrow interface can constrain available actions while also producing evidence about their use.

For a given obligation, first ask whether an invalid state can be excluded cheaply and reliably. If so, prefer a constraint. Otherwise, produce evidence: observe what happened, evaluate it against the obligation, and decide whether the verdict should control admission. Some properties cannot be excluded locally because they emerge only across actions, in the assembled system, or at runtime.

The mechanism follows the property. A type, architectural check, model checker, human review, and deployment test answer different engineering questions; they are not simply stronger and weaker versions of the same control.

## When failures become controls

A failure can expose a missing obligation or weak control. When the same judgment will matter again, engineers can change the environment: a recurring review question becomes a validator, a convention becomes a constraint, or a previously advisory check is connected to a gate. MAGE calls this governance conversion. The point is not to mechanize every judgment, but to preserve recurring engineering knowledge when it can be represented and evaluated reliably.

## From engineering knowledge to engineering control

The three units now fit together. Agents asked how engineers delegate realization without delegating responsibility: BOUND → EQUIP → AUTHORIZE → VERIFY. Modeling asked how engineers make consequential engineering knowledge explicit while leaving irrelevant choices free. Alignment asks how that knowledge should govern delegated work: state the obligation, check it where it can be decided, choose an appropriate mechanism, and determine what happens when the check fails.

Failures reveal what the environment does not yet know, see, evaluate, or enforce, and recurring judgments can sometimes be converted into durable control. The next unit, Failure-Aware Engineering, asks how to make that learning systematic.

Carry forward three decisions: what must be true, where can it be decided, and what should happen when it is false? Together they turn engineering obligations into a designed control system without assuming that every judgment belongs in an automated gate.
