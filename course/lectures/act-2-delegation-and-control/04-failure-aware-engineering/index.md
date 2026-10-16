---
title: Failure-Aware Engineering
readings:
  groups:
    - heading: Core reading
      items:
        - cite: davis2026sehandbook
          locator: 'chap. 11'
          annotation: 'Davis, [*The Software Engineering Handbook*, "Failure-Aware Engineering."](https://davisjam.github.io/model-based-agentic-software-engineering/book/se-handbook/10-failure-aware-engineering.html) This chapter provides the conceptual framework for the unit. Read for the distinction between repair and learning, failure as evidence about an engineering model, retrospective use of the engineering activities and Validation, and the three places a lesson can live: the system, the team, and the engineer. Pay particular attention to the question that organizes the chapter: after reality contradicts an expectation, what should we now believe?'
    - heading: The incident
      items:
        - cite: crowdstrike2024rca
          annotation: 'CrowdStrike, [*External Technical Root Cause Analysis — Channel File 291 Incident*](https://www.crowdstrike.com/wp-content/uploads/2024/08/Channel-File-291-Incident-Root-Cause-Analysis-08.06.2024.pdf) (2024). The official technical postmortem for the July 19, 2024 Falcon outage. As you read, distinguish the technical cause from the weaknesses in the engineering process, and consider which questions require examining the larger system.'
    - heading: Earlier reading revisited
      items:
        - cite: leveson2003stamp
          annotation: 'Leveson, Daouk, Dulac, and Marais, ["Applying STAMP in Accident Analysis"](../03-alignment/readings/leveson-stamp-accident-analysis-2003.pdf), previously assigned in Unit 12, Alignment. First read for control structures, constraints, feedback, and intervention; reread it now as a model of accident causation. Instead of asking how a control structure can enforce an obligation, ask what a failure reveals about the control structure that was supposed to do so. How does the explanation change as the causal boundary expands?'
      note: 'If you skipped this reading in Alignment, read it now.'
    - heading: Why is failure intrinsic to engineering?
      items:
        - cite: petroski1992
          locator: 'preface, chap. 1, and chap. 15'
          annotation: 'Petroski, *To Engineer Is Human: The Role of Failure in Successful Design* (1992). The book that argues failure is not an interruption of engineering but a condition of it: designs are built on incomplete knowledge, and the limits of that knowledge become visible mainly when something breaks. Read for failure as a source of engineering knowledge — failed designs expose assumptions and margins that successful operation leaves invisible — and for why a discipline that never failed would also never learn where its limits are. Written about bridges and buildings; the argument transfers to software without modification.'
    - heading: What kind of thing is an error?
      items:
        - cite: reason1990humanerror
          locator: 'chap. 1'
          annotation: 'Reason, *Human Error* (1990). Read for what an error *is* before asking whose it was: the distinctions among slips, lapses, and mistakes, and the argument that error is a by-product of the same cognitive processes that make skilled performance possible — not a separate defective mode a better person would avoid. The defense-in-depth account the lecture uses comes later in the book; this chapter supplies the theory of fallibility it rests on.'
    - heading: How does experience become judgment?
      items:
        - cite: schon1983reflective
          locator: 'pp. 49–69 and 76–79'
          annotation: 'Schön, *The Reflective Practitioner: How Professionals Think in Action* (1983). These pages describe the challenges of articulating what one knows, together with a concise summary of design as modeling. Focus on reflection-in-action, reflection-on-action, and the repertoire a practitioner accumulates through experience. Read it as an account of how a professional comes to recognize a situation, not as a method to follow.'
    - heading: How does an organization learn from failure?
      items:
        - cite: lunney2016postmortem
          annotation: 'Lunney, Lueder, and O''Connor, ["Postmortem Culture: Learning from Failure"](https://sre.google/sre-book/postmortem-culture/) (2016). A production-software practice for turning operational failures into shared organizational knowledge. Read for what a postmortem is asked to reconstruct, and for why blamelessness is an engineering stance rather than a courtesy: people acted under particular information, interfaces, and incentives, and those conditions are what an organization can change.'
        - cite: anandayuvaraj2026failures
          annotation: 'Anandayuvaraj et al., "Learning From Software Failures: A Case Study at a National Space Research Center" (ICSE 2026). Empirical evidence about how software practitioners gather, document, share, and apply lessons from failure. Read for what becomes difficult when the learning loop stays informal: lessons may remain tacit or fragmented, depend on individual memory, and fail to travel reliably across projects.'
  optional:
    - cite: norman2013
      annotation: 'Norman, *The Design of Everyday Things* (2013). Read for the distinction among slips, mistakes, and apparent "human error," and for how designed systems shape the conditions under which people err.'
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

## Investigating the CrowdStrike outage

On July 19, 2024, a defective CrowdStrike Falcon content update caused widespread crashes of Windows systems. The consequences extended beyond individual computers: airlines, hospitals, financial institutions, and other organizations experienced substantial disruption. Microsoft estimated that approximately 8.5 million Windows devices were affected — under one percent of all Windows machines.

The immediate technical explanation concerns the interaction between the content update and the software responsible for interpreting it. A mismatch between their assumptions resulted in an unsafe memory access and a system crash. At this scope, the engineering question is relatively narrow: What mechanism failed, and how could we correct it?

But correcting the mechanism does not explain why the update reached production. CrowdStrike's subsequent investigation identified weaknesses in the validation and release arrangements surrounding the content. Reason's Swiss cheese model offers a useful representation: failures can pass through several defenses when their weaknesses align. The engineering question becomes which defenses should have detected or contained the failure, and why did they not?

The incident raises a third question. Why could one vendor's defective update disrupt essential services across many otherwise independent organizations? The affected systems shared a consequential software dependency. This is a common-cause failure: components or organizations that appear independent can fail together because they depend on the same underlying mechanism.

Leveson's STAMP provides a way to investigate the larger system. It treats safety as a control problem involving constraints, controllers, controlled processes, and feedback. CrowdStrike controlled aspects of its software and update distribution; customer organizations controlled aspects of their operating environments and continuity arrangements; platform vendors and sector authorities possessed other forms of influence and authority. No single actor necessarily controlled the entire system.

This broader analysis exposes additional candidate interventions. Critical services might require independent fallback systems, stronger isolation from endpoint failures, more controlled update deployment, or diversity among security products. These alternatives have different costs and address different failure classes. The outage demonstrates widespread common-cause exposure; it does not establish that mandatory vendor diversity is the uniquely appropriate remedy.

The case illustrates the central judgment of failure analysis: What causal structure must we preserve to identify an effective intervention? A local defect may justify a local correction. A failure of engineering defenses may justify changes to validation or deployment. A systemic vulnerability may require changes to architecture, organizational responsibilities, or requirements imposed by another authority. Broader analysis is useful when the engineering decision requires it, not merely because it is broader.

This unit treats that chain as engineering. Failure analysis is an established discipline with competing models of what a failure is. The course's conceptual machinery adds precision to that discipline; it does not replace it.

## Models of failure

Failure analysis offers several ways to explain why a system failed. Different models preserve different parts of the causal structure:

- **Component-level causal models** trace the failure to a component, interaction, or chain of events, asking what mechanism produced the failure. Human error is one possible explanation within such an account — alongside incorrect assumptions, design defects, and implementation errors — not its definition. The resulting intervention is typically to repair the component or correct the interface. In the CrowdStrike case, this scope explains the crash: content and interpreter disagreed about the structure of the data crossing their interface.
- **Defense-in-depth models**, such as Reason's, ask how weaknesses in several defenses aligned to permit the failure. The intervention may be to strengthen or add a defense — and the diagnosis matters: a defense that was absent calls for a different response than one that ran and checked the wrong property.
- **Systems-theoretic models**, such as STAMP, represent accidents as failures of control and feedback across a socio-technical system. They may expose missing feedback paths, unsafe interactions, or inadequate constraints that are difficult to see by examining individual components — including constraints that no single organization can enforce alone.

These models form a landscape, not a ladder. Each preserves different causal structure and therefore makes different sites for effective intervention visible.

**A useful failure model should extend at least to the locus of control.** The appropriate boundary depends partly on the decisions the analyst can affect. Engineers may reason about requirements, interfaces, tests, observability, deployment controls, and human interaction; managers and executives can affect additional organizational conditions. A cause outside the analyst's authority still belongs in the account, but effective intervention may require escalation to someone who can act on it.

Broader is not automatically better. Recall the desire for simplicity from the Modeling unit: preserve the minimum structure needed to answer the engineering question. Apply the same reasoning to failure analysis. *What causal structure must we preserve to understand this failure well enough to act within our locus of control?*

This course has described software engineering as a sequence of activities. That sequence gives us another causal model for software failures. We can ask what inadequate understanding or judgment at each activity would look like:

- **Implementation.** *Did the realized software depart from an otherwise adequate design?*
- **Design.** *Did a selected mechanism have consequences inconsistent with its obligations?*
- **Architecture.** *Did responsibilities, boundaries, or shared resources make an important system property fragile?*
- **Specification.** *Did we misrepresent what the machine or its environment must provide?*
- **Requirements.** *Did we promise the wrong outcome, or omit an important obligation?*

Each question expands the possible source of the inadequacy, and one incident can expose several levels. Suppose a critical function and an ordinary workload share a queue nobody drew on the architecture diagram: an implementation defect floods it, but the reason the flood mattered is architectural.

## Why didn't we know?

Having identified causal factors, the next question is why the engineering process allowed them to produce a delivered failure. *Why did we build and trust a system that could behave this way?*

This moves the analysis from the failed artifact to the evidence and controls around it. Was the relevant assumption ever made explicit? What evidence supported it? Which validation activity should have challenged it? Did evidence exist but fail to reach the decision maker? Was a known obligation left unenforced?

Traverse the Validation model retrospectively (**claim → scope → mechanism → strategy → evidence strength → judgment**) and ask where it gave way. Perhaps we validated the wrong claim, or examined components when the property existed only at system scope. Sometimes nothing gave way: competent validation leaves residual uncertainty, and a failure can realize an uncertainty engineers knowingly accepted.

Failure also provides evidence about the measurements chosen before it occurred. If an important property failed while its indicators remained healthy, then the measurement system failed to expose something consequential. Measures such as failure frequency, recovery time, recurrence, and corrective-action completion answer different questions; none directly measures learning or engineering judgment. Treat the metrics themselves as hypotheses: did they make the consequential state of the system visible soon enough to act?

If work was delegated to agents, the Master Equation offers another diagnostic model:

> **p<sub>R</sub> = P(E | R) · P(I | E, R) · P(L | I, E, R)**

The equation describes the probability that delegation succeeds. A failure tells us that it did not. Diagnosis can then ask whether consequential intent was inadequately encoded, interpreted, or realized, or whether the surrounding engineering process failed to expose the discrepancy.

## What should change?

Diagnosis identifies what our previous understanding got wrong. Learning asks what should be different next time. A lesson can change the engineer, the engineering environment, or both.

A causal account explains how a failure occurred; it does not determine which future failures should be prevented or how. Engineers must decide what class of conditions the incident represents. A correction confined to the observed execution may leave the same mechanism available elsewhere, while an overly broad rule may constrain unrelated behavior. Having identified the consequential class, engineers return to specification, architecture, and design: what alternatives could prevent, detect, or contain it, and which intervention is justified by its consequences and cost?

**Reflection changes the engineer.** Experienced engineers develop **recognition**: a situation recalls an earlier failure, a harmless-looking assumption deserves investigation, or two apparently different problems reveal the same structure. Experience alone does not produce this capability. Engineers must connect what they expected with what occurred and decide what the difference means.

Schön's account of reflective practice gives the model:

**Decision → Consequence → Reflection → Repertoire → Future recognition**

Success feeds that repertoire ambiguously: a system may succeed because its engineering is sound, or because a latent weakness has not yet been exercised. Failure gives a sharper signal, provided the causal account that interprets it is sound.

**Governance conversion changes the engineering environment.** Some lessons should not have to be remembered and reconsidered by every future engineer. When a lesson is consequential, likely to recur, and can be represented and evaluated reliably, engineers can preserve it in the structures that govern future work. MAGE calls this **governance conversion**.

**Failure → Causal account → Lesson → What should change?**

![A failure or surprise raises the question "What was missing?", which resolves along five diagnostic axes — representation, obligation, evidence, evaluation, enforcement — each leading to a corresponding durable structure: a model, an invariant, a sensor, a validator, or a constraint or gate. Together these form durable engineering structure, which future work inherits, accumulating as engineering capital. The figure cautions that a failure is not a request for another gate: diagnose what was missing, then encode it.](figures/governance-conversion.svg)

Not every lesson warrants conversion. Failure evidence can be ambiguous, and a lesson can be overgeneralized or encoded incorrectly. The question is whether the failure supports a consequential and sufficiently general lesson that can reliably govern future work. When it does, Alignment supplies the mechanisms for making that lesson consequential.

## Failure closes the modeling loop

Models are useful because they omit most of reality and preserve the distinctions that matter to an engineering decision. Failure can reveal that we omitted a distinction that mattered after all.

The response is not to make every model more detailed. Failure supplies new evidence, and engineers must decide what it supports. If the newly discovered distinction is consequential and likely to matter again, it may deserve durable representation or control.

**Model selectively → realize → encounter reality → learn what the model missed → decide what now matters → strengthen the model or control → realize again**

Not every failure should make the model larger. That would eventually reproduce reality rather than model it. Failure-aware engineering asks which newly visible distinctions have earned their place.

## Applying the method

The lecture concludes with a transfer exercise built on Cloudflare's July 2019 outage, in which a Web Application Firewall rule containing a regular expression caused excessive CPU consumption and disrupted services. Before learning what happened, students apply failure mode and effects analysis (FMEA) — a structured search for potential failures, not a fourth causal model — first to the CrowdStrike system they now know, then to Cloudflare's WAF architecture alone, predicting failure modes under the incomplete information engineers actually have. Only then is the incident revealed, and students compare the failure modes they anticipated with those they missed. They then apply the same causal models to identify the immediate mechanism, investigate the defenses that permitted deployment, and consider what control structures could have limited the consequences.

The exercise asks students to select an intervention, identify the failure class it addresses, and explain what evidence would establish its effectiveness. The objective is not to choose the broadest causal model, but to choose one adequate for the engineering decision.

## Failure as part of engineering

Act II began with delegated work: deciding what to delegate and on what terms, representing what the work must preserve, and backing selected obligations with controls outside the producer's judgment. Failure closes the loop by supplying evidence about that engineered arrangement.

Failure-aware engineering therefore has two complementary outcomes. Reflection changes the engineer: experience enlarges the repertoire with which future situations are recognized and judged. Governance conversion changes the engineering environment: consequential lessons become models and controls that future work inherits. The first makes engineers better at recurring judgments. The second can make some recurring judgments unnecessary.

Recurring failure should leave structure behind.

---

**Read the expanded treatment:** [*The Software Engineering Handbook*, "Failure-Aware Engineering" →](https://davisjam.github.io/model-based-agentic-software-engineering/book/se-handbook/10-failure-aware-engineering.html)
