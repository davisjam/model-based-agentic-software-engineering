---
title: Engineering Decision-Making and Metrics
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
materials:
  - title: Lecture slides — Engineering Decision-Making and Metrics (forthcoming)
---

**Premise.** *Engineering decisions rest on evidence, and choosing what to measure is itself an engineering judgment.*

Software engineering requires decisions whose consequences cannot always be known directly. An architecture must be chosen before the system exists; a delivery must be justified before the world has responded to it. Engineers therefore identify the properties that matter and ask what observations or measurements could provide evidence about them.

Every unit of Act I has exercised this reasoning. Requirements asked what outcomes must hold in the world. Specification bounded what the machine and its environment must do. Architecture and Design compared alternatives by their consequences. Validation asked what evidence justifies a delivery. This lecture draws that shared structure together and makes it explicit: engineers identify consequential decisions, reason about the alternatives and their consequences, and determine what observations or measurements could provide evidence for those decisions.

## How does a measurement become evidence?

A decision points to properties that matter. A metric defines how some aspect of a property will be assessed. A measurement is a value observed by applying that metric under particular conditions. The measurement becomes evidence only through the property, metric, and conditions that give it meaning, and evidence becomes a decision only through interpretation. A measured p99 latency of 420 ms says nothing by itself; it bears on a decision because an architectural model bounded that path at 500 ms under a stated workload.

## Why is choosing a metric an engineering judgment?

A metric is a model: it represents some property of interest under assumptions, and the representation is necessarily incomplete. Almost no consequential decision can be resolved by a single measurement. The judgments recur:

- **What to measure.** Which properties bear on the decision at hand? Latency and memory yield to measurement readily; maintainability, productivity, and delivered value resist it.
- **Where to measure it.** Measure the property at the scope where it matters. Components can each meet a local latency budget while their end-to-end path exceeds the system's; a local measurement cannot substitute for evidence about a property that exists only in composition.
- **What the metric leaves out.** Every metric captures some aspects of a property and omits others. The omissions, not the captured value, are where decisions go wrong.
- **How to combine evidence.** A defensible decision rests on multiple forms of evidence, weighed together with the uncertainty that remains.

## When do metrics mislead?

Some failures recur often enough to deserve names. A **misleading proxy** captures something adjacent to the property of interest and quietly stands in for it. **Goodhart's Law** names a second family: once a measurement becomes a target, people and systems optimize the measurement rather than the underlying property. The lesson is not to avoid measurement. It is to treat the selection, interpretation, and combination of measurements as engineering work, subject to the same scrutiny as any other engineering decision.

---

**Read the expanded treatment:** [*The Software Engineering Handbook*, Introduction, "A note about metrics" →](https://davisjam.github.io/model-based-agentic-software-engineering/book/se-handbook/0-introduction.html)
