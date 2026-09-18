---
title: Validation
readings:
  groups:
    - heading: Review and testing in engineering practice
      items:
        - 'Winters et al., [*Software Engineering at Google*](https://abseil.io/resources/swe-book), Chapter 9, "Code Review," and Chapters 11–14 on testing. These chapters provide the practical foundation for the unit. Chapter 9 treats review as a way to bring another engineer''s knowledge and judgment to a change. Chapters 11–14 move from testing strategy through unit tests and test doubles to larger-scale testing. Read them as an account of how engineers obtain evidence at different scopes: what can each practice tell us, what assumptions does that evidence depend on, and what failures remain outside its reach? Full citation: Titus Winters, Tom Manshreck, and Hyrum Wright, eds., *Software Engineering at Google: Lessons Learned from Programming Over Time* (Sebastopol, CA: O''Reilly Media, 2020), chaps. 9 and 11–14.'
    - heading: 'Fuzz testing: let unexpected inputs find the failures'
      items:
        - 'Miller, Zhang, and Heymann, ["The Relevance of Classic Fuzz Testing: Have We Solved This One?"](https://doi.org/10.1109/TSE.2020.3047766) More than thirty years after Miller''s original fuzz-testing experiments, the authors return to a remarkably simple question: if we feed programs unexpected inputs, do they still fail? They do. Read this paper both as an introduction to the basic idea of fuzzing and as an unusually long-running engineering experiment. Why can such a simple validation strategy continue to find defects after decades of improvements in languages, tools, and development practices? Full citation: Barton P. Miller, Mengxiao Zhang, and Elisa R. Heymann, "The Relevance of Classic Fuzz Testing: Have We Solved This One?" *IEEE Transactions on Software Engineering* 48, no. 6 (2022): 2028–2039.'
    - heading: 'Property-based testing: state the property, search for counterexamples'
      items:
        - 'Cockx, ["An Introduction to Property-Based Testing with QuickCheck"](https://jesper.sikanda.be/posts/quickcheck-intro.html) (2020). Ordinary example-based tests choose particular inputs and determine what should happen for each one. Property-based testing asks the engineer to state properties that should hold across a class of inputs, then generates inputs in search of counterexamples. Cockx develops this idea through QuickCheck, including generated inputs, shrinking failures to simpler counterexamples, conditional properties, and different ways of discovering useful properties. Read for the underlying validation strategy rather than the Haskell syntax: what does the engineer still need to specify when test generation becomes cheap?'
      note: 'Further reading: Claessen and Hughes, ["QuickCheck: A Lightweight Tool for Random Testing of Haskell Programs"](https://doi.org/10.1145/351240.351266) (ICFP 2000), is the canonical paper introducing QuickCheck. Anthropic''s more recent treatment, ["Finding bugs across the Python ecosystem with Claude and property-based testing"](https://www.anthropic.com/research/property-based-testing) (2026), is useful as a contemporary application: inexpensive generated implementation makes the separation between producing code and stating useful properties about that code especially visible. Neither is necessary for understanding Cockx, but together they show where the technique came from and why it remains relevant in an agentic setting.'
    - heading: 'Differential testing: create an oracle by comparison'
      items:
        - 'McKeeman, ["Differential Testing for Software"](https://www.cs.tufts.edu/comp/150FP/archive/bill-mckeeman/DifferentailTesting.pdf) (1998). Testing is harder when engineers can generate inputs but do not know the correct output for each one. McKeeman shows how independently developed implementations can serve as partial oracles for one another: run the same input through each and investigate disagreements. Read this as a general strategy for obtaining evidence when specifying expected answers individually would be prohibitively expensive, not merely as a historical testing technique. Full citation: William M. McKeeman, "Differential Testing for Software," *Digital Technical Journal* 10, no. 1 (1998): 100–107.'
    - heading: 'Model checking: search the behaviors of a model'
      items:
        - 'Palshikar, ["An Introduction to Model Checking"](https://webdocs.cs.ualberta.ca/~paullu/C605/EMS-2004-02-12.pdf) (2004). Model checking makes the relationship among models, properties, and evidence unusually explicit. Engineers describe relevant system behavior in a formal model, state a property the model should satisfy, and use a model checker to explore the modeled behaviors. If the property fails, the checker can produce a counterexample showing how. Read this for both the strength and the limitation of the evidence: exhaustive analysis of a model can provide much stronger evidence than trying selected executions, but it establishes properties of the model engineers actually wrote, under the assumptions that model contains. Full citation: Girish Keshav Palshikar, "An Introduction to Model Checking," *Embedded Systems Programming*, February 2004.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: Lecture slides — Validation (forthcoming)
---

**Premise.** *Validation asks what evidence is sufficient to deliver a software system into the world.*

Software's updateability changes the economics of validation. Engineers can sometimes deliver before resolving every uncertainty, observe what happens, and repair the failures they discover: a game can ship with an occasional graphical defect. In that limited sense, *move fast and break things* describes a real engineering strategy.

But an update repairs the software, not necessarily the consequences of its previous behavior. It cannot recover money already lost, make disclosed information private again, or reverse a physical injury. As the consequences of being wrong grow more substantial or less reversible, learning through failure becomes more expensive. Validation therefore does not seek maximal confidence before every delivery; it asks what evidence is sufficient for *this* one.

Answering that requires four related judgments:

- **What is at stake?** What would happen if the system were wrong, and how reversible would the consequences be?
- **What must we establish?** What claims have to be justified before this delivery?
- **What evidence would bear on those claims?** Which observations, analyses, or checks would materially reduce the relevant uncertainty?
- **What should we do?** Given the consequences, claims, evidence, and remaining uncertainty, should we deliver, learn more, change something, or refuse?

The questions structure the judgment rather than script it; evidence can send an engineer backward.

## What is at stake?

Consider three defects: a game sometimes draws a character incorrectly, a TODO application occasionally loses a task, a medical device can deliver an incorrect dose. They differ in severity, reversibility, and how directly the software produces the harm. The game defect may annoy a player; the lost task destroys information on which a user depends; the wrong dose can directly injure its user. Almost any defect connects to severe harm through some causal chain, but causal distance matters: frustrated players sometimes behave badly, yet that does not make a graphical defect safety-critical.

Consequence establishes an evidentiary burden; it does not mechanically dictate the decision. Stakeholders and engineers can weigh the same consequence differently, and engineers do not merely execute the risk preferences of whoever controls the project: professional authority includes refusing a delivery the engineer cannot justify. The opposite error is real too: demanding far more assurance than the stakes warrant wastes resources and delays useful software. What is at stake determines how much uncertainty engineers can responsibly carry through delivery.

## What must we establish?

Validation begins with claims, not techniques. A payment service might need to establish that a payment cannot be charged twice, that unauthorized users cannot initiate payments, and that normal requests complete within an acceptable time. Evidence supporting one claim may say little about another. Begin with *what must be true for this delivery to be justified?* Only then choose how to obtain evidence.

These claims arise from engineering decisions made at different scopes. Requirements establish outcomes the engineering effort has promised in the world. Specification represents properties the machine and environment must have if those promises are to be kept. Architecture represents the organization through which system properties must emerge. Design represents mechanisms and local properties through which parts fulfill their responsibilities. Implementation produces the realization about which evidence can now be gathered.

The relationship can be pictured as a V. Down the left side, engineering models become progressively more specific as they constrain realization. A specification may bound response latency; an architectural model may allocate that latency across a path; a design may require a worker to remain below a memory limit or a retry mechanism to be idempotent. Up the right side, validation obtains evidence about those properties at the scopes where they apply.

![A V diagram. Down the left leg, engineering models become more specific toward realization at the point: Requirements (world outcomes), Specification (machine and environment), and Architecture and design. The point of the V is Realization. Up the right leg, validation gathers evidence at corresponding scopes: Local evidence low on the rising leg, then Compositional evidence, Boundary evidence, and World evidence at the top.](figures/models-evidence-v.svg)

*Models become more specific toward realization; validation gathers evidence about their properties at the scope where each applies.*

**Validate a property at the scope where the property lives.** Correct parts do not necessarily compose into a correct system. Components can each satisfy local latency budgets while their end-to-end path exceeds its system budget; individually reasonable assumptions can leave a responsibility unowned; correct retry mechanisms can interact to produce duplicate execution. Local evidence can support a broader argument, but it cannot substitute for evidence about a property that exists only in composition.

At the top of the V, the distinction from Specification returns: evidence about the MACHINE alone cannot establish every requirement in the WORLD. Engineers may also need evidence that the ENVIRONMENT provides the assumptions on which the specification depends and that MACHINE + ENVIRONMENT actually produce the promised outcome.

## What evidence would bear on those claims?

Some properties can be connected to observations through metrics. A property identifies something that matters to an engineering decision. A metric defines how some aspect of that property will be assessed. A measurement is an observed value obtained by applying that metric under particular conditions.

For example, an architectural model might require an end-to-end request path to remain below a 500 ms latency bound. Engineers could assess that property using p99 request latency under a defined workload. A measured value of 420 ms then provides evidence about the architectural claim. The value means little without the property, metric, workload, and environment that give it meaning.

![A horizontal chain of six boxes joined by labeled arrows: MODEL represents PROPERTY; PROPERTY is assessed by METRIC; METRIC applied yields MEASUREMENT; MEASUREMENT bears on EVIDENCE; EVIDENCE interpreted yields JUDGMENT.](figures/property-to-judgment.svg)

*A measurement becomes evidence only through the property and conditions that give it meaning.*

Metrics are therefore one connection between engineering models and evidence. A disagreement between a predicted and measured value may indicate a defective implementation, an incomplete model, an invalid assumption, or a poor metric. Validation asks which explanation the evidence supports rather than assuming that either the model or realization must be correct.

Not every important property is usefully reduced to a metric, and different claims require different kinds of evidence. The reasoning runs from each claim toward evidence capable of reducing the relevant uncertainty:

**claim → possible failure → useful evidence**

- **Review.** Bring another engineer's knowledge and perspective to the claim.
- **Example-based testing.** Check selected behaviors with known expected outcomes.
- **Property-based testing.** Search an input space for violations of stated properties.
- **Differential testing.** Compare independent realizations when the expected answer is difficult to state.
- **Fuzzing.** Explore unusual inputs and behaviors engineers may not have anticipated.
- **Static analysis.** Reason about possible behavior without executing every path.
- **Model checking.** Search a behavioral model for violations of stated properties.
- **Measurement and experimentation.** Obtain quantitative evidence about properties under stated conditions.
- **Operational evidence.** Observe behavior after delivery when learning in the world is acceptable.

Several of these answer the same underlying difficulty, the **oracle problem**: generating test cases is often far cheaper than stating the correct answer for each one. Property-based testing states the expected answer as a property; differential testing lets an independent implementation flag disagreements; model checking states the property over an explicit model and searches it exhaustively.

Neither a technique's name nor the quantity of evidence it produces establishes its strength. A model checker can exhaustively verify a property of the wrong model; thousands of generated tests can share one mistaken oracle; reviewers can share the author's mistaken assumption; a precise measurement can assess the wrong property. Ask of any evidence: *What uncertainty does this evidence reduce, at what scope, and what assumptions or failure modes remain?*

## What should we do?

Claims, evidence, and remaining uncertainty feed a decision with more than two outcomes:

- **Deliver.** The available evidence justifies accepting the remaining uncertainty.
- **Gather more evidence.** Additional information could materially change the decision.
- **Change the system.** Reducing the risk is preferable to gathering more evidence about it.
- **Revisit an upstream decision.** The evidence exposes a problem with a requirement, specification, architecture, or design choice.
- **Refuse.** No available course makes delivery professionally defensible.

These are not a checklist, and several feed backward. A failed validation need not mean "test more": sometimes the implementation should change, sometimes the architecture is wrong, and sometimes the commitment itself should be reconsidered. The question is therefore not simply *should we deliver?* but *what action follows from what we now know?*

Evidence also changes after delivery. Monitoring, incidents, measurements, and user reports change the state of knowledge; continuing to deliver is then a new decision under new evidence. Software's updateability, where this argument began, makes post-delivery learning unusually practical — and creates the matching obligation to respond when that learning undermines the justification for delivering at all.

---

**Read the expanded treatment:** [*The Software Engineering Handbook*, "Validation" →](https://davisjam.github.io/model-based-agentic-software-engineering/book/se-handbook/08-validation.html)
