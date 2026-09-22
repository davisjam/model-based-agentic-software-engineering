---
title: Alignment
sessions:
  - "Alignment: From Guidance to Authority"
  - "Alignment: Governing Realization"
readings:
  groups:
    - heading: The alignment principle
      items:
        - cite: davis2026mage
          locator: 'chap. 3 introduction, §§3.1–3.3.3, and §3.4'
          annotation: '{mage:3.1} and {mage:3.4} Davis, 2026. The spine of the unit, assigned in part rather than whole. Before Lecture 1, read the chapter opening and §§3.1–3.3.3: the opening establishes Alignment as the companion to Modeling; §3.1 develops guidance versus enforcement, intervention boundaries, and how different obligations become visible at different grains of work; §§3.2–3.3.3 carry the intellectual payload — agreement is not correctness, correspondence / conformance / acceptance, the earliest decidable boundary, the four roles, and matching the mechanism to the property rather than climbing a maturity ladder. Before Lecture 2, read §3.4: the ex ante / ex post distinction, governance conversion and its diagnostic, the merge failure made concrete, engineering capital, and where enforcement stops. Reading these beforehand lets the lectures use the vocabulary instead of spending the session introducing it. The remaining sections are optional; see below.'
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
    - 'MAGE, Chapter 3, §§3.3.4–3.3.7 and {mage:3.5}. The later §3.3 sections elaborate mechanisms that land better after the walk from linter to CI to constraints to sanctioned paths — provenance-carried admission in particular is taught in class rather than required beforehand. §3.5 answers what happens after a hundred controls accumulate: the natural extension for an interested student, not required preparation.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: Lecture 1 slides — From Guidance to Authority (forthcoming)
  - title: Lecture 2 slides — Governing Realization (forthcoming)
---

**Premise.** *Guidance shapes behavior; enforcement determines what the environment accepts.*

Earlier, we defined engineering as the discipline of exercising informed control over consequential systems and accepting responsibility for their outcomes. Informed control includes evaluating evidence for consequential properties, recognizing when assumptions fail, and intervening when necessary.

Software engineers already build this kind of control into their environments. A linter checks some properties while code is being written. A pre-commit hook can reject a change before it becomes a commit; a pre-push hook, before the work leaves the developer's machine. Continuous integration can evaluate the assembled change before merge. A deployment gate can inspect a release candidate before production accepts it. Runtime controls can restrict what the deployed system is permitted to do. These mechanisms operate at different boundaries because they can see different things: a linter may decide a property from one source file, an integration test may require the assembled system, and some properties become visible only after the system is running.

There is also a difference between asking for a property and checking it. A coding standard can tell an engineer not to introduce a forbidden dependency; an architectural check can reject that dependency. The first influences the producer. The second gives engineering knowledge consequences.

MAGE calls this broader practice Alignment: connecting engineering obligations to mechanisms that can constrain work, produce evidence, evaluate that evidence, and control what the environment accepts.

**Alignment Principle.** *Make engineering obligations enforceable by encoding them into mechanisms that constrain actions, produce evidence, evaluate that evidence, and control admission.*

## Two lectures, one progression

- **Lecture 1 — From Guidance to Authority** begins with the checks students already run and asks how an engineer decides what to enforce, where a property can actually be decided, and which mechanism should do the work. GUIDANCE → BOUNDARY → OBLIGATION → MECHANISM.
- **Lecture 2 — Governing Realization** asks how the governed environment grows: how failures and recurring judgments become durable engineering structure, what that structure is worth, and where enforcement should stop. FAILURE → DIAGNOSIS → GOVERNANCE CONVERSION → ENGINEERING CAPITAL.

## Check it where it can be decided

Consider the familiar progression: edit → commit → push → merge → deploy → runtime. Different checks attach to different points. Why not run every check as early as possible? Because some properties do not yet exist in a form that can be decided.

Suppose a deployed web application must correctly render data emitted by a backend service. No source-file check can establish that property: the source may compile, unit tests may pass, the emitted data may be individually valid, and the question becomes answerable only when the pieces compose in the served system. The same problem appears within a single task: when a change must end with the code and its architectural model in agreement, disagreement during intermediate commits may be perfectly legitimate. Rejecting each intermediate commit would enforce the right obligation at the wrong boundary.

This gives us a placement rule: **check an obligation at the earliest boundary where you can actually decide it.** Earlier checks usually make failures cheaper to repair, but moving a check earlier than its evidence permits does not make the control stronger. It makes the check incapable of deciding the property it claims to enforce. The boundary follows the property.

## Guidance is not enforcement

Suppose an agent receives the instruction: *do not merge unless the security tests pass.* Placed in a prompt, project instructions, or a skill, this guidance may strongly influence behavior. But the reasoner can misunderstand it, forget it, or decide incorrectly that the condition has been satisfied. Connect the same condition to a merge gate and something different happens: the environment determines whether the merge proceeds.

Both are useful, and Alignment is not an argument against instructions, documentation, review, or expert judgment. It asks which engineering obligations matter enough, and are sufficiently evaluable, that satisfying them should not depend solely on each future producer remembering and interpreting them correctly.

## An obligation the work can be wrong against

Before mechanizing an obligation, distinguish three questions that software engineering often mixes together:

- **Correspondence** — do two representations agree? Does an architectural model match the dependency graph extracted from the implementation?
- **Conformance** — does an artifact satisfy an independent obligation? Does this PDF satisfy the relevant standard?
- **Acceptance** — will the receiving environment take the result? Will CI admit the change?

Evidence for one does not establish the others, and agreement is not correctness. A representation derived from code may perfectly describe an unauthenticated endpoint: the representation and the implementation agree, and the security obligation is still violated. Alignment therefore needs an obligation against which the work can actually be wrong — a requirement, invariant, policy, tolerance, permission, schema, or model. What matters is not whether the representation was hand-written or derived; it is whether the mechanism has an independent engineering condition against which to judge the work.

## Four roles, and a preference for prevention

Once the obligation and its boundary are known, we can ask what the environment should do. MAGE distinguishes four roles:

- **Constraint** — narrows what may happen.
- **Sensor** — observes what happened and produces evidence.
- **Validator** — evaluates evidence against an obligation.
- **Gate** — controls whether work may cross a boundary.

These are roles, not four separate tools or four sequential stages. A CI test can sense behavior, validate the result, and gate the build; a narrow interface can constrain available actions while also producing evidence about their use.

The first engineering preference is prevention: if an invalid state can be excluded cheaply and reliably, prefer excluding it to repeatedly detecting it later. A closed enumeration can make an illegal value unrepresentable; a permission can prevent an agent from invoking a consequential action at all. Not every property can be held structurally — some appear only across sequences of individually legal actions, or only in the assembled artifact or at runtime. Those need evidence: observe, validate against the obligation, and decide whether the verdict controls admission. The mechanism follows the property — a type, an architectural check, a model checker, human review, and a deployment test are not stronger and weaker forms of Alignment; each answers a different engineering question.

## From blacklists to sanctioned paths

Generative implementation makes one Alignment problem visible: an agent can invent implementation paths its designers did not anticipate. Suppose all document color mutations must derive from a canonical color model. Banning every known bypass works while the forbidden surface stays small and recognizable, but future implementations may combine otherwise legitimate operations into a bypass no blacklist anticipated. Sometimes the allowed path is easier to characterize: the sanctioned abstraction attaches provenance ordinary callers cannot create, and the mutation boundary requires that provenance before accepting the operation. The rule of thumb: when forbidden paths are enumerable, ban them; when the allowed path is easier to characterize than all possible bypasses, make admission depend on evidence of the allowed path.

## What was missing?

No engineering environment begins with every future obligation represented and enforced. Some controls are designed before failure: engineers already know an endpoint must require authentication. Other controls begin with surprise.

Consider a merge automation that processes a backlog of agent-produced changes. Most changes rebase cleanly. Some conflict, and a convenience option resolves those conflicts automatically by choosing one side. Eventually, overlapping edits cause that behavior to silently discard content. The interesting part: the environment already had an audit that observed the conflict and correctly judged the automatic resolution unsafe. Then it emitted a warning and proceeded anyway.

What was missing? Not evidence — the condition had been observed. Not evaluation — the audit reached the correct judgment. The missing piece was enforcement, and the durable repair was not a louder warning: the unsafe capability was removed, and ambiguous conflicts were escalated instead.

The question generalizes into a diagnostic. Do not immediately add another test or another gate; ask what was missing. A recurring failure may expose several gaps:

- **Missing representation** — the relevant state or semantics were never modeled.
- **Missing obligation** — no stated invariant, policy, bound, or permitted set.
- **Missing evidence** — no sensor or trace observes the condition.
- **Missing evaluation** — evidence exists, but no validator judges it.
- **Missing enforcement** — the verdict exists and controls nothing.

One failure can reveal several gaps at once. The categories diagnose where durable engineering structure is missing; they do not prescribe one mechanism for every failure.

## Governance conversion and engineering capital

MAGE calls the ex-post version of this move governance conversion. A failure or important surprise exposes something future work should not have to rediscover, and engineering converts the lesson into durable structure. The repair fixes this instance. Governance conversion changes what future work inherits. The result may be a model rather than a gate: a failure may reveal knowledge never represented, or state the system cannot observe. This is why Modeling and Alignment form a feedback loop: Modeling makes engineering knowledge explicit, Alignment connects selected obligations to mechanisms that can act on them, and failure exposes weaknesses in either side.

When future work benefits from this durable structure, MAGE calls it engineering capital. Technical debt makes future work pay again for an expedient decision made today; engineering capital lets future work inherit engineering performed earlier. The important quantity is not the count of artifacts but the future engineering work they save or improve. Capital also depreciates: models drift, sensors become noisy, validators preserve assumptions that no longer hold, and a gate can eventually cost more than the failure it prevents. Accumulation is not the objective. Engineering a governed environment includes maintaining, reconciling, and eventually retiring its machinery.

## Not everything should be enforced

Alignment is not a march toward making every engineering decision mechanical. An engineering concern can stop in several places:

- **Residual** — the concern is not represented adequately; an engineer or agent must reconstruct the relevant meaning.
- **Judgment required** — the obligation is explicit, but no available evaluator can decide it adequately.
- **Evaluated only** — evidence is produced and evaluated, but the result does not control admission.
- **Governed** — the environment constrains the action or makes admission depend on the verdict.

These are design choices, not maturity levels. A cost metric may be worth observing without a hard budget. A probabilistic validator may serve triage while remaining too uncertain to block production. Stronger Alignment does not mean more gates; it means the obligations engineering chooses to enforce are enforced dependably at appropriate boundaries.

## The controls become a system

Grown far enough, the control machinery becomes an engineering system in its own right. One mechanism requires commits to be squashed; another rejects broad diffs; each is sensible alone, together incompatible. The conflict lives in the relation between controls. At that point the Modeling unit applies recursively: the machinery through which the environment governs work is itself worth modeling, so that its coverage and its conflicts become visible. The lecture develops that recursion.

## From engineering knowledge to engineering control

The three units now fit together. Agents asked how engineers delegate realization without delegating responsibility: BOUND → EQUIP → AUTHORIZE → VERIFY. Modeling asked how engineers retain informed control when the implementation contains more detail than any one decision needs: SELECT → REPRESENT → JOIN. Alignment asks what happens when some of that engineering knowledge must do more than inform the next reasoner: state the obligation, check it where it can actually be decided, choose an appropriate mechanism, and determine what happens when the check fails.

And the environment does not remain fixed: failures expose what it does not yet know, see, evaluate, or enforce, and governance conversion turns selected lessons into capital that future work inherits. The objective is not to eliminate engineering judgment. It is to decide where judgment should remain judgment, and where recurring judgment should become durable engineering structure. That is Alignment.
