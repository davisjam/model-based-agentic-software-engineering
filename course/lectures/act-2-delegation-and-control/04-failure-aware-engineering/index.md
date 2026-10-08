---
title: Failure-Aware Engineering
readings:
  groups:
    - heading: Earlier reading revisited
      items:
        - cite: leveson2003stamp
          annotation: 'Leveson, Daouk, Dulac, and Marais, ["Applying STAMP in Accident Analysis"](../03-alignment/readings/leveson-stamp-accident-analysis-2003.pdf), previously assigned in Unit 12, Alignment. First read for control structures, constraints, feedback, and intervention; reread it now as a model of accident causation. Instead of asking how a control structure can enforce an obligation, ask what a failure reveals about the control structure that was supposed to do so. How does the explanation change as the causal boundary expands?'
      note: 'If you skipped this reading in Alignment, read it now.'
    - heading: How experience becomes judgment
      items:
        - cite: schon1983reflective
          annotation: 'Schön, *The Reflective Practitioner: How Professionals Think in Action* (1983). Focus on reflection-in-action, reflection-on-action, and the repertoire a practitioner accumulates through experience. Read it as an account of how a professional comes to recognize a situation, not as a method to follow.'
    - heading: How does an organization learn from failure?
      items:
        - cite: lunney2016postmortem
          annotation: 'Lunney, Lueder, and O''Connor, ["Postmortem Culture: Learning from Failure"](https://sre.google/sre-book/postmortem-culture/) (2016). A production-software practice for turning operational failures into shared organizational knowledge. Read for what a postmortem is asked to reconstruct, and for why blamelessness is an engineering stance rather than a courtesy: people acted under particular information, interfaces, and incentives, and those conditions are what an organization can change.'
        - cite: anandayuvaraj2026failures
          annotation: 'Anandayuvaraj et al., "Learning From Software Failures: A Case Study at a National Space Research Center" (ICSE 2026). Empirical evidence about how software practitioners gather, document, share, and apply lessons from failure. Read for what becomes difficult when the learning loop stays informal: lessons may remain tacit or fragmented, depend on individual memory, and fail to travel reliably across projects.'
  optional:
    - cite: norman2013
      annotation: 'Read for the distinction among slips, mistakes, and apparent "human error," and for how designed systems shape the conditions under which people err.'
    - cite: reason1990humanerror
      annotation: 'Read for its causal account of human failure: fallibility, latent conditions, and defenses, and for the reasoning behind the Swiss-cheese model rather than the familiar diagram itself.'
    - cite: petroski1992
      annotation: 'Read for failure as a source of engineering knowledge: failed designs expose assumptions and limits that successful operation may leave invisible.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: "Lecture slides — Failure-Aware Engineering"
    src: 2-4-Failure-Aware-Engineering.pptx
---

**Premise.** *Failure is a predictable engineering outcome; engineering judgment develops when engineers connect decisions to their consequences and allow experience to change future decisions.*

Engineering is practiced with incomplete knowledge, imperfect models, fallible people, and finite evidence. Failure produces new evidence: something engineers expected to hold did not. The task is therefore not only to repair the problem, but to determine what the discrepancy reveals and what should change.

## Failure is evidence, not explanation

A failure is an observation. Reality reports that something engineers expected to hold did not; it does not report why, or what should change. Between the observation and any corrective action stands a chain of engineering judgment: a causal account interprets the observation, a lesson is a claim derived from that interpretation, and a corrective action embodies the claim. Each step can be wrong, and a bad failure analysis can harden the wrong lesson into an organization.

This unit treats that chain as engineering. Failure analysis is an established discipline with competing models of what a failure is. The course's conceptual machinery adds precision to that discipline; it does not replace it.

## Failure analysis depends on a model of causality

A failure does not explain itself. Engineers interpret an incident through some model of how failures arise, and that model determines what they look for and what interventions become visible.

Early accident models often emphasized a failed component or human action: identify the error and correct it. Later models widened the analysis. Reason's defense-in-depth account asks how weaknesses in several defenses aligned to permit an accident. Organizational models look farther upstream, asking how management decisions and working conditions shaped the actions visible at the point of failure. Systems-theoretic approaches such as STAMP widen the boundary further still, representing accidents as failures of control and feedback across a socio-technical system. These models form a landscape, not a ladder; each directs attention toward different interventions. An operator-error account suggests retraining or replacing the operator. A failed defense suggests strengthening the defense. A systemic account may instead reveal an architectural relationship, a missing feedback path, or an organizational condition. The causal model determines what the analysis can see, and therefore what it can recommend changing.

The broader view is powerful. An engineer's behavior may be shaped by interfaces, procedures, staffing, incentives, organizational decisions, regulation, and other constraints originating far from the immediate incident. A sufficiently broad model can represent all of these influences. But breadth creates its own engineering problem: a model that includes every possible influence becomes difficult to use, and more boxes and relationships may make the account more realistic while making the resulting intervention less clear.

**A useful failure model should extend at least to the locus of control.** The appropriate boundary depends partly on the decisions the analyst can affect. An engineer may need to reason about requirements, interfaces, tests, observability, review practices, deployment controls, and human interaction with the system. A manager may also need to consider staffing, ownership, training, schedules, escalation paths, and operating policies. An executive may need to consider organizational structure, investment, incentives, and relationships with regulators. A cause outside the analyst's authority still belongs in the account: it is escalated to someone who can act on it, compensated for, or named as the reason the problem cannot be solved locally, rather than dropped.

Broader models are not better simply because they are broader. This is the Modeling unit's parsimony applied to failure analysis: the analyst preserves the parts of the causal structure that matter to the decisions that follow. The question is not how comprehensive the analysis can be, but *what causal structure must we preserve to understand this failure well enough to act within our locus of control?*

## What failed?

An observed software failure is not necessarily an implementation failure. The engineering activities of this course supply a causal model of our own: a sequence of progressively broader hypotheses about where the engineering understanding was inadequate.

- **Implementation.** *Did the realized software depart from an otherwise adequate design?*
- **Design.** *Did a selected mechanism have consequences inconsistent with its obligations?*
- **Architecture.** *Did responsibilities, boundaries, or shared resources make an important system property fragile?*
- **Specification.** *Did we misrepresent what the machine or its environment must provide?*
- **Requirements.** *Did we promise the wrong outcome, or omit an important obligation?*

These are not bins for defects; each asks whether the inadequacy lay deeper than the one before, and one incident can expose several levels. Suppose a critical function and an ordinary workload share a queue nobody drew on the architecture diagram: an implementation defect floods it, but the reason the flood mattered is architectural.

## Why didn't we know?

A delivered failure invites a second analysis. The failure passed through everything intended to catch it, so it is evidence about the surrounding engineering process as well as the artifact. Turn the Validation model around (**claim → scope → mechanism → strategy → evidence strength → judgment**) and ask where it gave way: perhaps we validated the wrong claim, or examined components when the property existed only at system scope. Sometimes nothing gave way, because competent validation leaves residual uncertainty and a failure can realize an uncertainty engineers knowingly accepted.

*Why did the system behave this way?* concerns the artifact. *Why did we build and trust a system that could behave this way?* concerns the engineering, and is not an accusation.

## What should change?

Diagnosis identifies what our previous understanding got wrong. Learning asks where the correction should live. There are three interacting answers.

- **System.** A regression test preserves the observed example, which may be sufficient for a local implementation defect. A more general lesson may belong in an interface, architecture, specification, model, validation rule, or automated control. Future failures rhyme without repeating; ask what class of conditions this failure exposed. When a consequential lesson can reliably govern future work, preserving it as engineering structure is stronger than asking future engineers to remember it.
- **Team.** The lesson must reach people who did not live it, and the artifacts they will meet it in: the representations *R* the team reasons through, the harness *H* that governs future work, and the obligations against which future realizations are judged. A reflective postmortem reconstructs the understanding that preceded the incident: *What did we believe? Why? What did reality reveal that our model did not?*
- **Engineer.** Reflection identifies which relationships in an experience explain its consequence, so a later situation can be recognized as an old problem.

**Severity is a model of the consequence of violating an engineering obligation**, not a property of a defect: the same bounds error is minor in a disposable tool and critical in a network-facing component. A specification can therefore mark some obligations as more critical, and validation can demand stronger evidence for them.

## Measurement for decision-making

Every unit of this course asked what an engineer could observe to test the model it developed, and chose that observation while there was still time to deliberate. Failure runs the loop the other way: the observation arrives unselected, at a time nobody chose, and it already disagrees. The diagnostic question remains *what should change?*

The candidates include our metrics. Failure frequency, recovery time, corrective-action completion, and recurrence make the learning system observable, but each is a metric and therefore a model, and each distorts once it becomes a target. Recovery time measures operational response, not learning. A dashboard that stayed green through an outage is evidence about the dashboard. Judgment itself resists measurement: whether an engineer noticed a hazard in one case is evidence about judgment, not a quantity of it.

## How does experience become judgment?

Running these analyses repeatedly produces more than corrected systems. It produces experience, and alongside the deliberate judgment this course has emphasized, experienced engineers develop a second capability. A situation reminds them of an earlier failure. A harmless-looking assumption deserves investigation. Two different problems share a familiar structure. Call this **recognition**.

Experience alone does not produce it: engineers must connect what they expected with what occurred and decide what the difference means. Schön's account of reflective practice gives the model:

**Decision → Consequence → Reflection → Repertoire → Future recognition**

Success feeds that repertoire ambiguously: a system may succeed because its architecture is robust, or because a latent weakness has not yet been exercised. Failure gives a sharper signal, provided the causal account that interprets it is sound.

## The Master Equation

The course's diagnostic repertoire ends where Act II began. The Master Equation separates places where reliable delegated realization can fail.

> **p<sub>R</sub> = P(E | R) · P(I | E, R) · P(L | I, E, R)**

Delegation, Modeling, and Alignment used it prospectively. Read retrospectively, it gives one additional diagnostic model, specific to delegated work: when reality contradicts expectation, ask whether consequential intent was encoded, interpreted, realized, or adequately checked.

| Where failure may have entered | The diagnostic question |
|---|---|
| *R → E* | Was the consequential intent ever encoded, or did the obligation live only in someone's head? |
| *E → I* | Was the encoded intent interpreted as we meant it? |
| *I → L* | Did the realization preserve what was correctly understood? |
| Surrounding process *H* | Why did our evidence and controls not expose the discrepancy before reality did? |

A delivered failure rarely announces which link gave way. The same defect can mean that intent was never encoded, encoded intent was misread, understood intent was realized incorrectly, or the surrounding process produced no evidence until reality supplied it. The Master Equation does not replace the broader causal models; it joins the repertoire as one more lens, fitted to the failures of delegated realization.

## When should a lesson become a control?

Some lessons from failure should remain part of an engineer's repertoire. Others should not have to be remembered and reconsidered by every future engineer.

Suppose an incident reveals that two services must never share a particular resource, that a safety-critical operation requires an independent confirmation, or that a deployment must preserve a compatibility property. The organization can document the lesson and ask engineers to remember it. But if the obligation is consequential, recurring, and representable, a stronger response is to change the environment in which future engineering occurs.

The lesson might become a requirement or specification, an architectural constraint, a model, a validator, or a release gate. What was once a judgment made by a person after encountering a failure can become structure that shapes later work. MAGE calls this **governance conversion**: moving recurring engineering judgment into the environment around the realization so that future work inherits the lesson.

**Failure → Evidence → Interpretation → Lesson**, and the lesson then takes one of two paths:

- **Engineer's repertoire.** The lesson sharpens future recognition and judgment.
- **Governance conversion.** A recurring, consequential, representable lesson becomes a model, validator, constraint, or gate that governs future engineering.

This does not mean automating every lesson. Failure evidence can be ambiguous, lessons can be overgeneralized, and controls impose costs and can themselves encode incorrect assumptions. Conversion therefore requires judgment: What does the failure actually support? How broadly does the lesson generalize? Is the obligation consequential enough to preserve? Can it be represented and checked reliably?

When the answer supports conversion, Alignment provides the mechanism. A newly explicit obligation can first drive active alignment, changing an existing realization until it corresponds to the model. The same model and associated controls can then support passive alignment, checking later changes so that the repaired property is not silently lost.

## Failure closes the modeling loop

Models are useful because they omit most of reality and preserve the distinctions that matter to an engineering decision. Failure can reveal that we omitted a distinction that mattered after all.

The response is not simply to make every model more detailed. The failure is new evidence, and engineers must decide what it supports. If the newly discovered distinction is consequential and likely to matter again, it may deserve durable representation in a requirement, specification, architectural model, validator, or control. Governance conversion then moves that judgment into the engineering environment. The cycle is therefore:

**Model selectively → realize → encounter reality → learn what the model missed → decide what now matters → strengthen the model or control → realize again**

Not every failure should make the model larger. That would eventually reproduce reality rather than model it. Failure-aware engineering asks which newly visible distinctions have earned their place.

## Failure as part of engineering

Act II began by handing consequential work to a recipient that cannot bear responsibility for it. Everything since has been the engineering of that arrangement: deciding what to delegate and on what terms, representing what the work must preserve, backing selected obligations with controls outside the producer's judgment, and, when reality contradicts expectation anyway, treating the contradiction as evidence about the arrangement itself and converting what it teaches into better models and controls.

Failure-aware engineering therefore has two complementary outcomes. Reflection changes the engineer: experience enlarges the repertoire with which future situations are recognized and judged. Governance conversion changes the engineering environment: consequential lessons become models, constraints, validation mechanisms, and controls that future work inherits. The first makes engineers better at making recurring judgments. The second can make some recurring judgments unnecessary.

Failure is inevitable. Recurring failure should leave structure behind.

---

**Read the expanded treatment:** [*The Software Engineering Handbook*, "Failure-Aware Engineering" →](https://davisjam.github.io/model-based-agentic-software-engineering/book/se-handbook/10-failure-aware-engineering.html)
