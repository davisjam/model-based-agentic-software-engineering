---
title: Failure-Aware Engineering
readings:
  groups:
    - heading: Core reading
      items:
        - cite: davis2026sehandbook
          locator: 'chap. 11'
          annotation: 'Davis, [*The Software Engineering Handbook*, "Failure-Aware Engineering."](https://davisjam.github.io/model-based-agentic-software-engineering/book/se-handbook/10-failure-aware-engineering.html) This chapter provides the conceptual framework for the unit. Read for the distinction between repair and learning, failure as evidence about an engineering model, retrospective use of the engineering activities and Validation, and the three places a lesson can live: the system, the team, and the engineer. Pay particular attention to the question that organizes the chapter: after reality contradicts an expectation, what should we now believe?'
    - heading: Earlier reading revisited
      items:
        - cite: leveson2003stamp
          annotation: 'Leveson, Daouk, Dulac, and Marais, ["Applying STAMP in Accident Analysis"](../03-alignment/readings/leveson-stamp-accident-analysis-2003.pdf), previously assigned in Unit 12, Alignment. First read for control structures, constraints, feedback, and intervention; reread it now as a model of accident causation. Instead of asking how a control structure can enforce an obligation, ask what a failure reveals about the control structure that was supposed to do so. How does the explanation change as the causal boundary expands?'
      note: 'If you skipped this reading in Alignment, read it now.'
    - heading: How does experience become judgment?
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
      annotation: 'Norman, *The Design of Everyday Things* (2013). Read for the distinction among slips, mistakes, and apparent "human error," and for how designed systems shape the conditions under which people err.'
    - cite: reason1990humanerror
      annotation: 'Reason, *Human Error* (1990). Read for its causal account of human failure: fallibility, latent conditions, and defenses, and for the reasoning behind the Swiss-cheese model rather than the familiar diagram itself.'
    - cite: petroski1992
      annotation: 'Petroski, *To Engineer Is Human: The Role of Failure in Successful Design* (1992). Read for failure as a source of engineering knowledge: failed designs expose assumptions and limits that successful operation may leave invisible.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: "Lecture slides — Failure-Aware Engineering"
    src: 2-4-Failure-Aware-Engineering.pptx
---

**Premise.** *Failure is a predictable engineering outcome. Engineering judgment develops when engineers connect decisions to their consequences and allow experience to change future decisions.*

Engineering is practiced with incomplete knowledge, imperfect models, fallible people, and finite evidence. Failure therefore produces new evidence: something engineers expected to hold did not. But a failure is only an observation. It does not tell us why the expectation was wrong or what should change.

Between observation and corrective action stands a chain of engineering judgment. Engineers construct a causal account of what happened, derive lessons from that account, and decide what to change. Each step can be wrong. A bad failure analysis can preserve the wrong lesson just as effectively as a good one can preserve the right lesson.

This unit treats that chain as engineering. Failure analysis is an established discipline with competing models of what a failure is. The course's conceptual machinery adds precision to that discipline; it does not replace it.

## Models of failure

Failure analysis offers several ways to explain why a system failed. Different models preserve different parts of the causal structure:

- **Component and human-error models** look for the component, action, or decision that failed. The resulting intervention may be to repair the component, change a procedure, or retrain an operator.
- **Defense-in-depth models**, such as Reason's, ask how weaknesses in several defenses aligned to permit the failure. The intervention may be to strengthen or add a defense.
- **Organizational models** ask how management decisions, incentives, resources, and working conditions shaped what happened at the point of failure. The effective site of intervention may therefore be far from the visible error.
- **Systems-theoretic models**, such as STAMP, represent accidents as failures of control and feedback across a socio-technical system. They may expose missing feedback paths, unsafe interactions, or inadequate constraints that are difficult to see by examining individual components.

These models form a landscape, not a ladder. Each preserves different causal structure and therefore makes different sites for effective intervention visible.

**A useful failure model should extend at least to the locus of control.** The appropriate boundary depends partly on the decisions the analyst can affect. An engineer may reason about requirements, interfaces, tests, observability, deployment controls, and human interaction; a manager may additionally consider staffing, ownership, training, schedules, and operating policies; an executive may consider organizational structure, investment, incentives, and external relationships. A cause outside the analyst's authority still belongs in the account: escalate it to someone who can act, compensate for it, or identify it as the reason the problem cannot be solved locally.

Wider causal boundaries can reveal explanations that narrower models miss, but broader is not automatically better. Recall the desire for simplicity from the Modeling unit: preserve the minimum structure needed to answer the engineering question. We should apply the same reasoning to failure analysis. *What causal structure must we preserve to understand this failure well enough to act within our locus of control?*

This course has described software engineering as a sequence of activities. That sequence gives us another causal model for software failures. We can ask what it would mean to attribute a failure to inadequate understanding or judgment at each activity.

- **Implementation.** *Did the realized software depart from an otherwise adequate design?*
- **Design.** *Did a selected mechanism have consequences inconsistent with its obligations?*
- **Architecture.** *Did responsibilities, boundaries, or shared resources make an important system property fragile?*
- **Specification.** *Did we misrepresent what the machine or its environment must provide?*
- **Requirements.** *Did we promise the wrong outcome, or omit an important obligation?*

Each asks whether the inadequacy lies deeper than the one before, and one incident can expose several levels. Suppose a critical function and an ordinary workload share a queue nobody drew on the architecture diagram: an implementation defect floods it, but the reason the flood mattered is architectural.

**Severity is a model of the consequence of violating an engineering obligation**, not a property of a defect: the same bounds error is minor in a disposable tool and critical in a network-facing component. A specification can therefore mark some obligations as more critical, and validation can demand stronger evidence for them.

## Why didn't we know?

Having identified causal factors, the next question is why the engineering process allowed them to produce a delivered failure. *Why did we build and trust a system that could behave this way?*

This question moves the analysis from the failed artifact to the evidence and controls around it. Was the relevant assumption ever made explicit? What evidence supported it? Which validation activity should have challenged it? Did evidence exist but fail to reach the decision maker? Was a known obligation left unenforced?

Traverse the Validation model retrospectively (**claim → scope → mechanism → strategy → evidence strength → judgment**) and ask where it gave way: perhaps we validated the wrong claim, or examined components when the property existed only at system scope. Sometimes nothing gave way, because competent validation leaves residual uncertainty and a failure can realize an uncertainty engineers knowingly accepted.

Failure also gives us evidence about the measurements we chose before it occurred. If an important property failed while its indicators remained healthy, then the measurement system failed to expose something consequential. Conversely, measures such as failure frequency, recovery time, recurrence, and corrective-action completion answer different questions; none measures "learning" or "engineering judgment" directly. Treat the metrics themselves as hypotheses. After a failure, ask whether they made the consequential state of the system visible soon enough to act.

## What should change?

Diagnosis identifies what our previous understanding got wrong. Learning asks where the correction should live. There are three interacting answers.

- **System.** A regression test preserves the observed example, which may be sufficient for a local implementation defect. A more general lesson may belong in an interface, architecture, specification, model, validation rule, or automated control. Future failures rhyme without repeating; ask what class of conditions this failure exposed. When a consequential lesson can reliably govern future work, preserving it as engineering structure is stronger than asking future engineers to remember it.
- **Team.** The lesson must reach people who did not live it and the artifacts through which future engineers will encounter it. A reflective postmortem reconstructs the understanding that preceded the incident: *What did we believe? Why? What did reality reveal that our model did not?*
- **Engineer.** Reflection identifies which relationships in an experience explain its consequence, so a later situation can be recognized as an old problem.

## How does experience become judgment?

Running these analyses repeatedly produces more than corrected systems. Alongside the deliberate judgment this course has emphasized, experienced engineers develop a second capability. A situation reminds them of an earlier failure. A harmless-looking assumption deserves investigation. Two different problems share a familiar structure. Call this **recognition**.

Experience alone does not produce it: engineers must connect what they expected with what occurred and decide what the difference means. Schön's account of reflective practice gives the model:

**Decision → Consequence → Reflection → Repertoire → Future recognition**

Success feeds that repertoire ambiguously: a system may succeed because its architecture is robust, or because a latent weakness has not yet been exercised. Failure gives a sharper signal, provided the causal account that interprets it is sound.

## The Master Equation

Delegated work offers one additional lens. The Master Equation describes the probability that delegation succeeds:

> **p<sub>R</sub> = P(E | R) · P(I | E, R) · P(L | I, E, R)**

In the event of a failure, the outcome has apparently resolved to unsuccessful. If agents participated in the work, we can use the equation retrospectively: was consequential intent encoded poorly, interpreted incorrectly, or realized incorrectly? Or did the surrounding engineering process fail to detect the discrepancy?

This is not a general theory of failure. It is a diagnostic model for failures involving delegated realization.

## When should a lesson become a control?

A lesson matters only if it changes future decisions. Some lessons remain judgment carried by engineers; recurring or consequential lessons may instead justify changing a model, procedure, or mechanism. MAGE calls this move **governance conversion**.

**Failure → Causal account → Lesson → What should change?**

The lesson then takes one of two paths:

- **Engineer's repertoire.** The lesson sharpens future recognition and judgment.
- **Governance conversion.** A recurring, consequential, representable lesson becomes a requirement or specification, an architectural constraint, a model, a validator, or a release gate that governs future engineering.

This does not mean automating every lesson. Failure evidence can be ambiguous, lessons can be overgeneralized, and controls impose costs and can themselves encode incorrect assumptions. Conversion therefore requires judgment: What does the failure actually support? How broadly does the lesson generalize? Is the obligation consequential enough to preserve? Can it be represented and checked reliably?

When the answer supports conversion, Alignment supplies the mechanisms for making the lesson consequential in future work.

## Failure closes the modeling loop

Models are useful because they omit most of reality and preserve the distinctions that matter to an engineering decision. Failure can reveal that we omitted a distinction that mattered after all.

The response is not simply to make every model more detailed. The failure is new evidence, and engineers must decide what it supports. If the newly discovered distinction is consequential and likely to matter again, it may deserve durable representation or control. Governance conversion then moves that judgment into the engineering environment. The cycle is therefore:

**Model selectively → realize → encounter reality → learn what the model missed → decide what now matters → strengthen the model or control → realize again**

Not every failure should make the model larger. That would eventually reproduce reality rather than model it. Failure-aware engineering asks which newly visible distinctions have earned their place.

## Failure as part of engineering

Act II began by handing consequential work to a recipient that cannot bear responsibility for it. Everything since has been the engineering of that arrangement: deciding what to delegate and on what terms, representing what the work must preserve, backing selected obligations with controls outside the producer's judgment, and, when reality contradicts expectation anyway, treating the contradiction as evidence about the arrangement itself and converting what it teaches into better models and controls.

Failure-aware engineering therefore has two complementary outcomes. Reflection changes the engineer: experience enlarges the repertoire with which future situations are recognized and judged. Governance conversion changes the engineering environment: consequential lessons become models and controls that future work inherits. The first makes engineers better at recurring judgments. The second can make some recurring judgments unnecessary.

Failure is inevitable. Recurring failure should leave structure behind.

---

**Read the expanded treatment:** [*The Software Engineering Handbook*, "Failure-Aware Engineering" →](https://davisjam.github.io/model-based-agentic-software-engineering/book/se-handbook/10-failure-aware-engineering.html)
