---
title: Failure-Aware Engineering
readings:
  groups:
    - heading: How experience becomes judgment
      items:
        - cite: schon1983reflective
          annotation: 'Schön, *The Reflective Practitioner: How Professionals Think in Action* (1983). The conceptual foundation for the unit. Focus on reflection-in-action, reflection-on-action, and the repertoire a practitioner accumulates through experience. Read it as an account of how a professional comes to recognize a situation, not as a method to follow.'
    - heading: Making a failure available to the organization
      items:
        - cite: lunney2016postmortem
          annotation: 'Lunney, Lueder, and O''Connor, ["Postmortem Culture: Learning from Failure"](https://sre.google/sre-book/postmortem-culture/) (2016). A production-software practice for turning operational failures into shared organizational knowledge. Read for what a postmortem is asked to reconstruct, and for why blamelessness is an engineering stance rather than a courtesy: people acted under particular information, interfaces, and incentives, and those conditions are what an organization can change.'
        - cite: anandayuvaraj2026failures
          annotation: 'Anandayuvaraj et al., "Learning From Software Failures: A Case Study at a National Space Research Center" (ICSE 2026). Empirical evidence about how software practitioners gather, document, share, and apply lessons from failure. Read for what happens when the learning loop stays informal: lessons remain tacit or fragmented, depend on individual memory, and related problems recur across projects.'
  optional:
    - cite: norman2013
      annotation: 'Slips, mistakes, and the relationship between apparent human error and the designed systems through which people act.'
    - cite: reason1990humanerror
      annotation: 'Human fallibility, latent conditions, and defenses — the reasoning behind the Swiss-cheese model, rather than the diagram.'
    - cite: petroski1992
      annotation: 'Failure as a source of engineering knowledge about the limits of designs and models.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: Lecture slides — Failure-Aware Engineering (forthcoming)
---

**Premise.** *Failure is a predictable engineering outcome; engineering judgment develops when engineers connect decisions to their consequences and allow experience to change future decisions.*

Engineering is practiced with incomplete knowledge, imperfect models, fallible people, and finite evidence. Failure produces new evidence: something engineers expected to hold did not. The task is therefore not only to repair the problem, but to determine what the discrepancy reveals and what should change.

## How does experience become judgment?

Alongside the deliberate judgment this course has emphasized, experienced engineers develop a second capability. A situation reminds them of an earlier failure. A harmless-looking assumption deserves investigation. Two different problems share a familiar structure. Call this **recognition**.

Experience alone does not produce it: engineers must connect what they expected with what occurred and decide what the difference means. Schön's account of reflective practice gives the model:

**Decision → Consequence → Reflection → Repertoire → Future recognition**

Success feeds that repertoire ambiguously: a system may succeed because its architecture is robust, or because a latent weakness has not yet been exercised. Failure gives a sharper signal, but it does not explain itself.

## What failed — and why didn't we know?

An observed software failure is not necessarily an implementation failure. The engineering activities from this course pose a sequence of progressively broader questions about what the incident revealed:

- **Implementation.** *Did the realized software depart from an otherwise adequate design?*
- **Design.** *Did a selected mechanism have consequences inconsistent with its obligations?*
- **Architecture.** *Did responsibilities, boundaries, or shared resources make an important system property fragile?*
- **Specification.** *Did we misrepresent what the machine or its environment must provide?*
- **Requirements.** *Did we promise the wrong outcome, or omit an important obligation?*

One incident can expose several levels. Suppose a critical function and an ordinary workload share a queue nobody drew on the architecture diagram: an implementation defect floods it, but the reason the flood mattered is architectural.

A delivered failure invites a second analysis. Turn the Validation model around — **claim → scope → mechanism → strategy → evidence strength → judgment** — and ask where it gave way: perhaps we validated the wrong claim, or examined components when the property existed only at system scope. Sometimes nothing gave way, because competent validation leaves residual uncertainty and a failure can realize an uncertainty engineers knowingly accepted.

*Why did the system behave this way?* concerns the artifact. *Why did we build and trust a system that could behave this way?* concerns the engineering, and is not an accusation.

## What should change?

Learning from failure occurs at three interacting levels.

- **System.** A regression test preserves the observed example, often enough for an implementation defect. A more general lesson belongs in an interface, an architecture, a specification, a validation rule, or an automated control. Future failures rhyme without repeating, so ask what class of conditions this one exposed.
- **Team.** The lesson must reach people who did not live it. A reflective postmortem reconstructs the understanding that preceded the incident: *What did we believe? Why? What did reality reveal that our model did not?*
- **Engineer.** Reflection identifies which relationships in an experience explain its consequence, so a later situation can be recognized as an old problem.

**Severity is a model of the consequence of violating an engineering obligation**, not a property of a defect: the same bounds error is minor in a disposable tool and critical in a network-facing component. A specification can therefore mark some obligations as more critical, and validation can demand stronger evidence for them.

## Measurement for decision-making

Every unit of this course asked what an engineer could observe to test the model it developed, and chose that observation while there was still time to deliberate. Failure runs the loop the other way: the observation arrives unselected, at a time nobody chose, and it already disagrees. We made decisions using models. We measured reality to inform them. Reality contradicted one of our expectations. *Which model should change?*

The candidates include our metrics. Failure frequency, recovery time, corrective-action completion, and recurrence make the learning system observable, but each is a metric and therefore a model, and each distorts once it becomes a target. Recovery time measures operational response, not learning. A dashboard that stayed green through an outage is evidence about the dashboard. Judgment itself resists measurement: whether an engineer noticed a hazard in one case is evidence about judgment, not a quantity of it.

## Failure as part of engineering

Two further questions belong to this course: which lesson should become an enforceable obligation, and where should the new knowledge live? The goal is not zero failure; finite evidence makes that impossible. It is to spend consequential experience well: repair the system, understand what the failure revealed, preserve the lessons worth keeping, and let new evidence improve the decisions that follow. Failure is inevitable. Recurring failure is not.

---

**Read the expanded treatment:** [*The Software Engineering Handbook*, "Failure-Aware Engineering" →](https://davisjam.github.io/model-based-agentic-software-engineering/book/se-handbook/10-failure-aware-engineering.html)
