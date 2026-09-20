---
title: Failure-Aware Engineering
readings:
  groups:
    - heading: How experience becomes judgment
      items:
        - 'Schön, *The Reflective Practitioner: How Professionals Think in Action* (1983). The conceptual foundation for the unit. Focus on reflection-in-action, reflection-on-action, and the repertoire a practitioner accumulates through experience. Read it as an account of how a professional comes to recognize a situation, not as a method to follow. Full citation: Donald A. Schön, *The Reflective Practitioner: How Professionals Think in Action* (New York: Basic Books, 1983).'
    - heading: Making a failure available to the organization
      items:
        - 'Lunney, Lueder, and O''Connor, ["Postmortem Culture: Learning from Failure"](https://sre.google/sre-book/postmortem-culture/) (2016). A production-software practice for turning operational failures into shared organizational knowledge. Read for what a postmortem is asked to reconstruct, and for why blamelessness is an engineering stance rather than a courtesy: people acted under particular information, interfaces, and incentives, and those conditions are what an organization can change. Full citation: John Lunney, Sue Lueder, and Gary O''Connor, "Postmortem Culture: Learning from Failure," in *Site Reliability Engineering: How Google Runs Production Systems*, ed. Betsy Beyer, Chris Jones, Jennifer Petoff, and Niall Richard Murphy (Sebastopol, CA: O''Reilly Media, 2016).'
        - 'Anandayuvaraj et al., "Learning From Software Failures: A Case Study at a National Space Research Center" (ICSE 2026). Empirical evidence about how software practitioners gather, document, share, and apply lessons from failure. Read for what happens when the learning loop stays informal: lessons remain tacit or fragmented, depend on individual memory, and related problems recur across projects. Full citation: Dharun Anandayuvaraj, Tanmay Singla, Zain A. H. Hammadeh, Andreas Lund, Alexandra Holloway, and James C. Davis, "Learning From Software Failures: A Case Study at a National Space Research Center," in *Proceedings of the 48th IEEE/ACM International Conference on Software Engineering* (2026).'
  optional:
    - 'Norman, *The Design of Everyday Things*, revised and expanded ed. (2013). Slips, mistakes, and the relationship between apparent human error and the designed systems through which people act.'
    - 'Reason, *Human Error* (1990). Human fallibility, latent conditions, and defenses — the reasoning behind the Swiss-cheese model, rather than the diagram.'
    - 'Petroski, *To Engineer Is Human: The Role of Failure in Successful Design* (1992). Failure as a source of engineering knowledge about the limits of designs and models.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: Lecture slides — Failure-Aware Engineering (forthcoming)
---

**Premise.** *Failure is a predictable engineering outcome; engineering judgment develops when engineers connect decisions to their consequences and allow experience to change future decisions.*

Engineering is practiced with incomplete knowledge, imperfect models, fallible people, and finite evidence. Requirements can omit something important; specifications can misrepresent the environment; design decisions can interact unexpectedly; implementations contain defects; and validation leaves residual uncertainty. Engineering cannot promise that failure will never occur. Failure does produce new evidence: something engineers expected to hold did not. The task is therefore not only to repair the problem, but to determine what the discrepancy reveals and what should change.

## How does experience become judgment?

The course has emphasized deliberate judgment: construct models, identify consequential properties and tradeoffs, gather evidence, decide despite uncertainty. Experienced engineers develop a second capability. A situation reminds them of an earlier failure. A harmless-looking assumption deserves investigation. Two different problems share a familiar structure. Call this **recognition**.

Experience alone does not produce it. Engineers must connect what they expected with what occurred and decide what the difference means. Schön's account of reflective practice gives us the model:

**Decision → Consequence → Reflection → Repertoire → Future recognition**

Success contributes to that repertoire, but ambiguously: a system may succeed because its architecture is robust, because the workload is forgiving, or because a latent weakness has not yet been exercised. Failure gives a sharper signal — reality has contradicted an expectation — but it does not explain itself. Engineers must determine which model, assumption, or decision the observation challenges.

## What failed — and why didn't we know?

An observed software failure is not necessarily an implementation failure. The engineering activities from this course locate what the incident revealed:

- **Requirements.** *Did we promise the wrong outcome, or omit an important obligation?*
- **Specification.** *Did we misrepresent what the machine or its environment must provide?*
- **Architecture.** *Did responsibilities, boundaries, or shared resources make an important system property fragile?*
- **Design.** *Did a selected mechanism have consequences inconsistent with its obligations?*
- **Implementation.** *Did the realized software depart from an otherwise adequate design?*

One incident can expose several levels. Suppose a critical function and an ordinary workload share a queue nobody drew on the architecture diagram: an implementation defect floods it, but the reason the flood mattered is architectural.

A delivered failure also invites a second analysis: why didn't our evidence expose the problem? Turn the Validation model around — **claim → scope → mechanism → strategy → evidence strength → judgment** — and ask where it gave way. Perhaps we validated the wrong claim, or examined components when the property existed only at system scope. Perhaps the mechanism could not expose the behavior, or the search strategy never reached it. Sometimes none of these happened: competent validation leaves residual uncertainty, and a failure can realize an uncertainty engineers knowingly accepted.

The two analyses differ. *Why did the system behave this way?* concerns the artifact. *Why did we build and trust a system that could behave this way?* concerns the engineering — and is not an accusation. The system's boundaries, safeguards, and assumptions came from earlier decisions made under some understanding of the world; failure lets us compare that understanding with what reality later revealed.

## What should change?

Learning from failure occurs at three interacting levels — **system**, **team**, and **engineer**.

- **System.** A regression test preserves the observed example, often enough for an implementation defect. A more general lesson may belong in an interface, an architecture, a specification, a validation rule, or an automated control. Future failures can rhyme with the original without reproducing it, so ask what class of conditions it exposed.
- **Team.** The lesson must reach people who did not live it. A postmortem reconstructs what happened; a reflective postmortem also reconstructs the understanding that preceded it: *What did we believe? Why? What evidence made that belief credible? What did reality reveal that our model did not?*
- **Engineer.** Reflection identifies which relationships in an experience explain its consequence — not to memorize failures, but to recognize when a new situation resembles an old engineering problem.

Severity connects these responses to consequence. **Severity is a model of the consequence of violating an engineering obligation**, not a property of a defect: the same bounds error is minor in a disposable tool and critical in a network-facing component. A specification can therefore mark some obligations as more critical, and validation can demand stronger evidence for them.

## Can we measure whether we learned?

Failure-aware engineering creates observables: failure frequency and severity, detection and recovery time, corrective-action completion, recurrence within and across projects, and whether lessons become durable engineering structure.

Each is a metric, and therefore a model. Recovery time measures operational response, not learning. Completed action items show that planned work occurred, not that it addressed the right lesson. Recurrence may suggest a lesson was too narrow, but deciding whether two incidents share an underlying failure requires judgment. Each also distorts once it becomes a target.

Judgment itself cannot be reduced to a metric. We can observe whether an engineer recognizes a hazard, questions an assumption, or decides soundly in one case. Those observations are evidence about judgment; they do not yield a quantity of it. Metrics make the learning system observable; they do not judge what was learned.

## Failure as part of engineering

This unit turns the rest of the course backward. Before delivery, Requirements, Specification, Architecture, Design, and Validation ask what we should promise and why we should believe the system will deliver it. After failure, the same models let us reconstruct what we believed and find where reality disagreed. Two further questions belong to this course: which lesson should become an enforceable obligation, and where should the new knowledge live?

The goal is not zero failure; finite evidence makes that impossible. It is to use consequential experience well: repair the system, understand what the failure revealed, preserve the lessons worth retaining, and let new evidence improve the decisions that follow. Failure is inevitable. Recurring failure is not.

---

**Read the expanded treatment:** [*The Software Engineering Handbook*, "Failure-Aware Engineering" →](https://davisjam.github.io/model-based-agentic-software-engineering/book/se-handbook/10-failure-aware-engineering.html)
