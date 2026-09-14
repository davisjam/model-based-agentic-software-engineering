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

Software's updateability changes the economics of validation. Engineers can sometimes deliver a system before resolving every uncertainty, observe what happens, and repair what they learn. A game can ship with an occasional graphical defect. An internal tool can be useful despite awkward workflows. A consumer application may need to reach users before its engineers can learn which capabilities people actually value. In these cases, delaying delivery until every known uncertainty has been resolved can cost more than learning from use.

In that limited sense, *move fast and break things* describes a real engineering strategy. It is not always irresponsible to deliver software that might fail. The engineering question is whether discovering the failure after delivery is an acceptable way to learn.

That qualification matters because software's updateability repairs the software, not necessarily the consequences of its previous behavior. An update can correct a graphical defect after players encounter it. It cannot necessarily recover money already lost, make disclosed information private again, or reverse a physical injury. As the consequences of being wrong become more substantial or less reversible, learning through failure becomes more expensive.

Validation therefore does not seek the maximum possible confidence before every delivery. It asks what we need to know before *this* delivery, given what is at stake, what stakeholders need, and what engineers are professionally prepared to stand behind.

## Consequence and professional judgment

Consider three software defects. A game sometimes draws a character incorrectly. A TODO application occasionally loses a task. A medical device can sometimes deliver an incorrect dose.

These defects differ in severity and in how directly the software produces their consequences. The game defect may annoy a player. The TODO application destroys information on which a user may depend. The medical device can directly injure its user. Almost any software defect can be connected to severe harm through a sufficiently long causal chain, but causal distance matters: frustrated players sometimes behave badly, yet that does not make an ordinary graphical defect safety-critical.

Consequences do not mechanically determine whether delivery is justified. Stakeholders and engineers can understand the same consequence and reach different judgments about what it requires. An organization or regulator may judge a residual risk acceptable while an engineer concludes that the available evidence does not justify delivery.

Engineers therefore exercise professional judgment rather than merely implement the preferences of whoever controls the project. That judgment can fail in either direction. Demanding far more assurance than the consequences and stakeholder needs warrant wastes resources and delays useful software. Demanding less assurance than the consequences warrant can make the engineer willing to deliver work they should not stand behind. Professional authority includes the ability to refuse delivery when the engineer cannot justify it.

## From claims to evidence

Validation begins with what engineers need to establish, not with a catalog of testing techniques. A payment service might need to establish that a payment cannot be charged twice, that unauthorized users cannot initiate payments, and that normal requests complete within an acceptable time. Evidence supporting one claim may say little about another.

The engineering problem therefore runs from the claim toward appropriate evidence: claim → possible failure → useful evidence. Different techniques provide different kinds of evidence. The useful question is what each technique can establish, what failures it can expose, and what uncertainty remains.

- **Review** — other engineers inspect the reasoning or artifact, bringing knowledge and perspectives its author may have missed.
- **Example-based testing** — exercises selected behaviors against expected results; useful when important cases and their expected outcomes are known.
- **Property-based testing** — states properties that should hold across a space of inputs and searches that space for counterexamples.
- **Differential testing** — compares independent implementations or systems when a trustworthy expected result is otherwise difficult to obtain.
- **Fuzzing** — explores large or unusual input spaces to find behaviors the engineer did not anticipate.
- **Static analysis** — reasons about possible program behaviors without requiring each behavior to be produced through execution.
- **Model checking** — checks stated properties over the behaviors represented by a model and produces counterexamples when a property fails.
- **Operational evidence** — observes what happens after delivery, providing evidence that may confirm or invalidate the assumptions that justified it.

Several of these techniques answer the same underlying difficulty, the *oracle problem*: engineers can often generate inputs far more cheaply than they can state the correct output for each one. Property-based testing responds by stating the expected answer as a property. Differential testing lets an independent implementation flag the suspicious case. Model checking states the property over an explicit behavioral model and searches the state space for a violation.

No technique supplies confidence by its name alone. A model checker can exhaustively check a property of the model while leaving an incorrect model untouched. Thousands of generated tests can explore an input space while sharing the same mistaken oracle. A code review can bring independent judgment while still missing behavior that neither reviewer considered. Evidence must be evaluated relative to the claim it supports and the assumptions on which it depends.

## How much evidence is enough?

Additional evidence has a cost. For low-consequence and reversible decisions, delivering sooner and learning from use may be preferable to eliminating every uncertainty beforehand. As consequences become more substantial, direct, or irreversible, engineers should demand stronger evidence before using the world as the place where failures are discovered.

Evidence also changes after delivery. Monitoring, incidents, measurements, experiments, and user reports can reveal consequences that were uncertain or unknown beforehand. Continuing to deliver the same behavior is then a new engineering decision made with different knowledge. Software's updateability makes learning after delivery unusually practical, but it also gives engineers unusual ability to respond once the evidence changes.

The validation decision is therefore not always *deliver* or *do not deliver*. Engineers can gather more evidence, change the system, revisit an earlier requirement or design decision, constrain how the software is delivered, or refuse to deliver it. The objective is sufficient evidence for a defensible decision given what is at stake.
