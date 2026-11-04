---
title: Operations & SRE
readings:
  groups:
    - heading: Deciding what counts as healthy
      items:
        - cite: beyer2016sre
          locator: 'chapter 4, Service Level Objectives'
          annotation: 'Beyer, Jones, Petoff and Murphy (eds.), *Site Reliability Engineering: How Google Runs Production Systems* (O''Reilly, 2016), [chapter 4, "Service Level Objectives"](https://sre.google/sre-book/service-level-objectives/). Read the whole chapter; the publisher makes the book freely available at [sre.google/books](https://sre.google/books/). It separates the indicator from the objective and treats the choice of indicator as an engineering decision rather than a reporting convenience. Two things in it carry the lecture. An objective is stated over an interval and against a defined set of eligible events, which is what makes an error budget a quantity you can spend rather than a slogan. And an aggregate measure can look healthy while a subset of users is served badly, so the chapter argues for distributions over means. The account of Google''s internal review process is context rather than content.'
    - heading: Turning an incident into organizational learning
      items:
        - cite: beyer2016sre
          locator: 'chapter 15, Postmortem Culture: Learning from Failure'
          annotation: 'Beyer, Jones, Petoff and Murphy (eds.), *Site Reliability Engineering* (O''Reilly, 2016), [chapter 15, "Postmortem Culture: Learning from Failure"](https://sre.google/sre-book/postmortem-culture/). Read the whole chapter. This is the more important of the two readings. It explains how an incident becomes organizational learning instead of an occasion to identify whoever made a mistake, and it ties each corrective action to an owner and to the evidence that closes it. Read it against the Failure-Aware Engineering unit: the argument is the one this course makes about converting an observed failure into a durable control. The chapter''s templates and tooling matter less than its insistence that the record exists to be acted on.'
      note: 'If you read only one of these, read the second.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
materials:
  - title: "Lecture slides — Operations and SRE"
    src: 3-6-Operations-and-SRE.pptx
---

**Premise.** *A running system produces evidence that no predeployment activity can obtain. Operators must decide what to observe, what to do when the system misbehaves, and what to change once it recovers.*

The reservation service is deployed, and students are booking rooms with it. Nothing in the previous units establishes whether it is working, because each of them reasoned about the system before it met its users. The tests ran against a workload we chose. The threat model described adversaries we imagined. Operations starts where those stop: behavior is now a fact rather than a prediction, and someone is accountable for it.

## Structure of this unit

One lecture, run as an incident-response workshop rather than an exposition. You will receive incomplete information about a running service, decide what to do, then revise that decision as new evidence arrives. Four scenarios progress from stated alternatives to a response you propose yourself.

Answer each scenario twice: once for the reservation service, once for your own project. Projects differ in architecture, dependencies, data sensitivity and cost, so they do not owe their users the same operational guarantees.

Keep an incident worksheet for each scenario, with five fields.

- **What do we know?** Observed facts, separated from inference.
- **What do we suspect?** Hypotheses, named as such.
- **What evidence do we need?** The next observation.
- **What action will we take?** The decision, and whose it is.
- **What would change our mind?** The revision condition.

Close each sheet with one permanent control. The last field does the most work: a decision recorded without its revision condition cannot be revisited honestly.

Every scenario sits somewhere on one loop.

![Seven stages form one cycle, read across two rows. The upper row runs left to right through four boxes. RUNNING SYSTEM, sub-labeled serving real users now, leads to OBSERVATIONS, sub-labeled only what we instrumented, which leads to DIAGNOSIS, sub-labeled a hypothesis, not a cause, which leads to RESPONSE, sub-labeled chosen under uncertainty. A dashed arc arches back above the row from DIAGNOSIS to OBSERVATIONS, labeled returns for more evidence, because a diagnosis commonly asks for an observation nobody has yet made. From RESPONSE a connector runs out to the right margin and down into the lower row, reaching RECOVERY, sub-labeled the incident ends here. The lower row then runs right to left in the warm color that marks what happens after the incident: RECOVERY leads to POSTMORTEM, sub-labeled contributing conditions, which leads to NEW CONTROLS, sub-labeled the durable change. From NEW CONTROLS a return edge runs left to the margin, up the left side, and back into RUNNING SYSTEM, labeled feeds back into production, closing the cycle. A legend distinguishes the stages during the incident, drawn in blue, from the stages after it, drawn in the warm color, and distinguishes the solid sequence edges from the dashed return for more evidence. A closing note reads that recovery ends the incident but does not change the conditions that produced it, and that only the last stage alters what the next incident will look like.](figures/operational-feedback-loop.svg)

## Defining service health

A **service level indicator** measures one aspect of observed behavior. A **service level objective** sets a target for an indicator over a stated interval. Both are choices, and the choosing is where the engineering happens.

Infrastructure measurements do not establish health. Processor utilization, memory consumption and the proportion of HTTP 200 responses can all look unremarkable while the service fails at its purpose, because none of them mentions a reservation. An indicator earns its place by naming behavior a user would recognize: a confirmation that arrives, a booking that still exists tomorrow.

An **error budget** converts an objective into a quantity you can spend, and one percentage denotes two different quantities. Under a time-based availability measure, 99.9% over thirty days permits 43.2 minutes of unavailable time. Under a request-based indicator, it permits 0.1% of eligible requests to fail, which need not correspond to 43.2 minutes of anything. Decide which you mean before quoting the figure.

Some obligations resist the percentage form. *No confirmed reservation is lost* states an integrity obligation, not an availability target: a budget permitting 0.1% of confirmed bookings to vanish is not a service level anyone would accept. Telling the two apart is worth the argument it provokes.

## Obtaining operational evidence

Three kinds of telemetry answer three different questions.

| Evidence | What it answers |
|---|---|
| Metrics | How much? How often? How widespread? |
| Logs | What event occurred, with what context? |
| Traces | Where did a particular request spend time? |

None substitutes for another. Metrics establish scope and trend and seldom explain a cause. Logs carry context about particular events and will not say how many users were affected. A trace follows one request across components and attributes its elapsed time, which makes it the only one that answers *where did the time go* directly.

Evidence also costs. Instrumentation consumes capacity, storage and attention, so nobody observes everything. An operator decides in advance which behavior to make visible, and that decision settles which incidents will be diagnosable at all.

## Responding to incidents

An **alert** claims that a person should act now. Alerting on a symptom users feel keeps the claim honest. Alerting on every threshold crossing trains people to dismiss it.

A **runbook** states the symptoms, the diagnostic checks, the permitted actions, the escalation conditions, and how to verify that the service has recovered. It records decisions the organization made in advance, while leaving room for judgment when the incident differs from expectations. Followed mechanically through a situation it does not describe, a runbook is worse than none.

Mitigations trade one obligation against another, rarely symmetrically. Stopping writes, failing requests explicitly, queueing work for later, failing over, and continuing to retry each cost something specific. Queueing is the instructive case. Accepting a reservation request you cannot complete may be unsafe if the user believes a queued request is a confirmed booking, so failing explicitly may be preferable to accepting work whose outcome cannot be guaranteed. Timing is the other trap: an event that coincides with the onset of an incident is not thereby its cause, and a mitigation aimed at the wrong cause spends time the users are paying for.

## Learning from incidents

Recovery ends the incident. It does not change the conditions that produced it.

A useful postmortem records the impact and timeline, the technical and organizational conditions that contributed, how the problem was detected and handled, the corrective actions with named owners, and the evidence required to close each one. Avoid reducing it to a root cause. A complex incident usually involves several contributing conditions, and the single-cause account appeals because it is short rather than because it is true.

Corrective actions differ in reach. Repairing a defect addresses that defect. A regression test addresses its recurrence. A new testing method addresses defects of the same kind. An alert shortens detection. A revised runbook improves the response. An architectural limit bounds the damage. Only some alter the conditions under which a similar incident can happen again, and separating the local repair from the durable change is the judgment this unit asks you to exercise.

## Engineering judgment

Operational responsibility is continuous, which sets it apart from the activities in earlier units. There is no point at which the system has been operated. What an operator can know is bounded by what someone chose to observe, and every judgment is made while users are being served.

This returns to Failure-Aware Engineering. An observed failure should change the software and the mechanisms that govern future work on it, and repairing one failure is not the same as changing the conditions that let its class recur. The concluding unit asks that question of the course as a whole: which models an organization maintains, what evidence it demands, and which obligations justify enforcement.
