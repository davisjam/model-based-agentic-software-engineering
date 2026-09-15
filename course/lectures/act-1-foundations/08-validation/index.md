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

Validation begins with claims, not techniques. A payment service might need to establish that a payment cannot be charged twice, that unauthorized users cannot initiate payments, and that normal requests complete within an acceptable time. Evidence supporting one claim may say little about another. These claims are not invented at validation time: they inherit from the requirements the effort committed to, the specification that bounded acceptable behavior, and the architecture and design decisions about how the realization satisfies them. Validation asks which of those claims matter to *this* delivery decision. Begin with *what must be true for this delivery to be justified?* Only then choose techniques.

## What evidence would bear on those claims?

Different techniques produce different kinds of evidence, so the reasoning runs from each claim toward the evidence that would bear on it:

**claim → possible failure → useful evidence**

- **Review.** Bring another engineer's knowledge and perspective to the claim.
- **Example-based testing.** Check selected behaviors with known expected outcomes.
- **Property-based testing.** Search an input space for violations of stated properties.
- **Differential testing.** Compare independent realizations when the expected answer is difficult to state.
- **Fuzzing.** Explore unusual inputs and behaviors engineers may not have anticipated.
- **Static analysis.** Reason about possible behavior without executing every path.
- **Model checking.** Search a behavioral model for violations of stated properties.
- **Operational evidence.** Observe behavior after delivery when learning in the world is acceptable.

Several of these answer the same underlying difficulty, the **oracle problem**: generating test cases is often far cheaper than stating the correct answer for each one. Property-based testing states the expected answer as a property; differential testing lets an independent implementation flag disagreements; model checking states the property over an explicit model and searches it exhaustively.

Neither a technique's name nor the quantity of evidence it produces establishes its strength. A model checker can exhaustively verify a property of the wrong model; thousands of generated tests can share one mistaken oracle; reviewers can share the author's mistaken assumption. Ask of any evidence: *What uncertainty does this evidence reduce, and what assumptions or failure modes remain?*

## What should we do?

Claims, evidence, and remaining uncertainty feed a decision with more than two outcomes:

- **Deliver.** The available evidence justifies accepting the remaining uncertainty.
- **Gather more evidence.** Additional information could materially change the decision.
- **Change the system.** Reducing the risk is preferable to gathering more evidence about it.
- **Revisit an upstream decision.** The evidence exposes a problem with a requirement, specification, architecture, or design choice.
- **Refuse.** No available course makes delivery professionally defensible.

These are not a checklist, and several feed backward. A failed validation need not mean "test more": sometimes the implementation should change, sometimes the architecture is wrong, and sometimes the commitment itself should be reconsidered. The question is therefore not simply *should we deliver?* but *what action follows from what we now know?*

Evidence also changes after delivery. Monitoring, incidents, measurements, and user reports change the state of knowledge; continuing to deliver is then a new decision under new evidence. Software's updateability, where this argument began, makes post-delivery learning unusually practical — and creates the matching obligation to respond when that learning undermines the justification for delivering at all.
