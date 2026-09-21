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

**Premise.** *Engineering requires making consequential decisions under incomplete knowledge. A good engineering decision is the decision best justified by the evidence available when it must be made.*

Engineers expect to be wrong sometimes. Our models are incomplete, our evidence is finite, and consequential decisions often must be made before their outcomes can be observed. Engineering cannot eliminate that uncertainty. It can reduce how often we are wrong, make the remaining uncertainty explicit, and improve the basis on which we act.

The premise separates a decision from its outcome. A good decision can produce a bad outcome: engineers may choose the alternative best supported by the available evidence and still encounter a condition they could not reasonably have predicted. Conversely, a poorly justified decision can succeed through luck. We should learn from both outcomes without judging the quality of the original decision solely by what happened afterward.

The engineering problem therefore has two complementary questions:

- **Before the decision:** Given what we know, what should we do?
- **After the outcome:** Given what happened, what should we now believe?

The first question is the subject of engineering decision-making; the second lets experience improve the models and judgment behind future decisions.

Software engineering asks the first question continually; the particular decision changes across the engineering process, but the reasoning recurs. Metrics matter because measurement is one important way of obtaining the evidence that reasoning needs. But measurement is subordinate to the decision: we do not begin by asking what we can measure; we begin by asking what we need to decide. The *Measurement for decision-making* sections throughout Act I have applied this reasoning to particular engineering decisions. This lecture makes the shared structure explicit.

## What decision are we making?

Different engineering activities present different decisions. Requirements asks whether the engineering effort should make a commitment. Specification asks where responsibility should lie and which distinctions among acceptable behaviors to constrain. Architecture asks how responsibilities and interactions should be organized so that competing obligations can coexist. Design asks which mechanism should realize a responsibility. Validation asks whether the available evidence justifies delivery.

Each decision has alternatives with different consequences. Requirements might accept, revise, investigate, or reject a candidate commitment. Architecture might choose among organizations that trade latency against isolation or changeability. Design might choose among mechanisms that trade memory against complexity. Validation might deliver, gather more evidence, change the system, revisit an earlier decision, or refuse.

The first task is to identify the decision clearly enough to ask: *what consequences distinguish the alternatives, and what do we need to know to decide?* That question determines what information is worth acquiring.

## How do models let us reason before we know?

Engineering decisions often precede their consequences: we choose an architecture before observing the completed system's behavior, accept a requirement before knowing what satisfying it will cost, deliver before observing every condition the deployed system will encounter.

Models let us reason across that gap. A process model identifies certainty, changeability, and decomposability as properties relevant to arranging work. A specification represents obligations and environmental assumptions. An architectural model represents responsibilities, boundaries, interactions, and predicted system properties. A design model represents the consequential tradeoffs among mechanisms. The model does not make the decision; it identifies the relationships we believe matter and lets us reason about their consequences.

Engineering decision-making therefore has a recurring structure:

**Decision → Model → Consequential property → Evidence → Judgment → Action**

The structure is deliberately general. Useful evidence may come from analysis, prior experience, review, prototypes, experiments, formal reasoning, operational observation, or measurement. Which evidence matters depends on the decision and on the uncertainty preventing a confident choice.

## What evidence would change the decision?

Once the decision and model are explicit, engineers can replace *what should we measure?* with a more useful question: *what could we observe that would change what we decide?*

Suppose a specification assumes an upstream service responds within five seconds, and the decision is whether that assumption is acceptable. Production traces showing responses routinely taking thirty seconds bear directly on that decision: they challenge the model on which the specification rests. Or suppose an architecture claims a request path completes within 200 milliseconds. That property exists across the composed path, so end-to-end traces can show whether the prediction holds and where the latency budget goes; per-component measurements cannot establish it when queuing or interaction contributes substantially to the result.

The reasoning does not require numbers. A prototype may demonstrate that a design is feasible. A counterexample may invalidate an assumption. A review may reveal that the wrong requirement was accepted. A test may expose behavior the specification forbids. The purpose of evidence is not to accumulate information; it is to reduce uncertainty that matters to a decision.

## When is measurement useful?

Some consequential properties can be made observable through measurement. A metric is a model connecting a property we care about to observations we can obtain; applying it under particular conditions produces a measurement, and interpreting the measurement against the property produces evidence. For measurement, the larger decision process contains a smaller chain:

**Property → Metric → Measurement → Evidence**

Suppose an architectural model bounds an end-to-end request path at 500 milliseconds. Engineers might choose p99 request latency under a defined workload as the metric; a measured 420 milliseconds then provides evidence about the architectural claim. The number alone establishes little. Change the workload, measurement location, percentile, or definition of the request path, and its meaning may change. The useful question is not *what is the number?* but *what does this observation establish about the property that matters to our decision?*

Measure at the scope where the property exists. Component latency does not establish end-to-end latency when composition contributes additional delay; commit counts do not establish engineering productivity; requirements churn does not by itself distinguish productive learning from poor requirements work. Every metric represents some aspects of reality and omits others.

## What should we do?

Evidence informs judgment; it does not replace it. Two engineers can possess the same measurement and rationally decide differently, because the consequences, remaining uncertainty, reversibility, or evidentiary burden differ. That measured 420 milliseconds against a 500-millisecond bound may be comfortable evidence under one workload and weak evidence under another, and the same unresolved uncertainty might be acceptable in a game and unacceptable in a medical device.

Metrics can also mislead when engineers forget what they represent. A **misleading proxy** substitutes something observable for the property actually at issue. **Goodhart's Law** names a second danger: once a measurement becomes a target, people and systems can optimize the measurement rather than the property it was intended to represent.

Engineering judgment therefore returns to the first of the two questions: given what we know now, what should we do? The answer may be to proceed, choose another alternative, gather more evidence, change the system, revise the model, or decline to act; evidence is valuable insofar as it changes the justification for one of those actions.

Later, the action produces consequences and we ask the second question: given what happened, what should we now believe? The answer may leave our model intact, narrow the conditions under which we trust it, or reveal an assumption worth reconsidering. Occasionally, a bad outcome occurs despite a reasonable decision because the outcome lay within uncertainty the engineers had knowingly accepted. That is evidence for future engineering, not a verdict on the earlier decision.

Across the engineering process, the details differ but the reasoning recurs:

**Decision → Model → Evidence → Judgment → Action → Outcome → New evidence**

Engineering continues around this loop. Models let us act before we know everything; evidence gives us reason to prefer some actions over others; outcomes test the understanding under which we acted; and judgment determines what the new evidence should change. Measurement is one important path from model to evidence, not the purpose of the process. The purpose is to make consequential engineering decisions under incomplete knowledge while retaining informed control over what happens next.

---

**Read the expanded treatment:** [*The Software Engineering Handbook*, Introduction, "A note about metrics" →](https://davisjam.github.io/model-based-agentic-software-engineering/book/se-handbook/0-introduction.html)
