---
title: Validation
readings:
  groups:
    - heading: Review and testing in engineering practice
      items:
        - 'Winters et al., [*Software Engineering at Google*](https://abseil.io/resources/swe-book), Chapter 9, "Code Review," and Chapters 11–14 on testing. These chapters provide the practical foundation for the unit. Chapter 9 treats review as a way to bring another engineer''s knowledge and judgment to a change. Chapters 11–14 move from testing strategy through unit tests and test doubles to larger-scale testing. Read them as an account of how engineers obtain evidence at different scopes: what can each practice tell us, what assumptions does that evidence depend on, and what failures remain outside its reach? Full citation: Titus Winters, Tom Manshreck, and Hyrum Wright, eds., *Software Engineering at Google: Lessons Learned from Programming Over Time* (Sebastopol, CA: O''Reilly Media, 2020), chaps. 9 and 11–14.'
    - heading: 'Human attention is a finite validation mechanism'
      items:
        - 'Warm, Parasuraman, and Matthews, ["Vigilance Requires Hard Mental Work and Is Stressful"](https://doi.org/10.1518/001872008X312152) (2008). Why human monitoring is itself demanding work, and why assurance cannot scale simply by putting more machine output in front of human reviewers. The authors gather evidence that sustained watching consumes attentional resources, imposes measurable workload, and produces stress, rather than being the passive activity it appears to be. Read it for what it implies about review as an evidence mechanism: reviewers are valuable where judgment is required, not as indefinitely scalable detectors of rare defects. Full citation: Joel S. Warm, Raja Parasuraman, and Gerald Matthews, "Vigilance Requires Hard Mental Work and Is Stressful," *Human Factors* 50, no. 3 (2008): 433–441.'
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
  - title: Lecture slides — Validation
    src: 1-8-Validation.pptx
---
**Premise.** *Validation asks what evidence is sufficient to deliver a software system into the world.*

Software's updateability changes the economics of validation. Engineers can sometimes deliver under uncertainty, observe what happens, and repair what they discover. But an update repairs the software, not necessarily the consequences of its previous behavior. It cannot recover money already lost, make disclosed information private again, or reverse a physical injury.

Validation therefore does not seek certainty before every delivery. It asks what evidence is sufficient for *this* delivery. That requires several related judgments: what is at stake, which claims require confidence, where those claims exist, what evidence can bear on them, how strong that evidence is, and how much uncertainty engineers can responsibly carry into the world.

## What is at stake?

Consequence establishes an evidentiary burden. A graphical defect in a game, a TODO application that loses information, and a medical device that delivers an incorrect dose do not demand the same assurance because being wrong does not have the same consequences.

Engineers must consider both the severity of a possible consequence and how directly the software can cause it. Almost any defect can be connected to serious harm through a sufficiently long chain of events, but that does not make every defect safety-critical. An incorrect radiation dose can directly injure a patient; a graphical glitch does not acquire the same significance merely because an annoyed user might subsequently act badly. The more direct and substantial the consequence, the stronger the evidence we should demand.

Reversibility matters as well. Some failures can be repaired cheaply after delivery; others leave consequences that an update cannot undo. Demanding more assurance than the stakes warrant wastes resources and delays useful software; demanding too little transfers unjustified risk into the world.

The question is therefore not *can we prove the system correct?* It is *what uncertainty can we responsibly carry through this delivery?*

## Where must we establish confidence?

Validation begins with claims, not techniques. Specification states what the machine must do under assumptions about its environment; requirements identify outcomes promised in the world. Validation asks what evidence bears on those claims and where that evidence must attach.

Evidence can exist at several scopes. For a payment system required to charge a submitted payment at most once, engineers might obtain local evidence that an idempotency component rejects duplicate identifiers, compositional evidence about interacting retry mechanisms, system evidence at the assembled service boundary, and world evidence about the payment provider's actual semantics.

Smaller scopes make failures cheaper to reproduce, localize, and diagnose. But some properties exist only in composition. Components can each satisfy local latency budgets while their end-to-end path exceeds its system budget; individually correct mechanisms can interact incorrectly; machine-side evidence cannot establish that an environmental assumption actually holds.

Validate a property at the smallest scope capable of establishing it — but no smaller.

The familiar terms *unit*, *integration*, *system*, and *acceptance* describe roughly these scopes. They tell us where evidence attaches, not how that evidence was obtained.

## How can we obtain evidence?

Scope and evidence mechanism are independent choices. Engineers can obtain evidence through several mechanisms:

- **Dynamic testing** observes selected executions. Its limitation is sampling: executions not performed remain unobserved.
- **Static analysis** reasons about possible behavior without executing it. Its conclusions depend on the abstraction and guarantees of the analysis.
- **Human review and inspection** contribute semantic knowledge and judgment that may not be encoded mechanically, but human attention is finite.
- **Formal methods** reason mechanically over explicit models and properties. Their guarantees extend only as far as the model, property, assumptions, and bounds.
- **Measurement and experimentation** obtain quantitative evidence under stated conditions.
- **Operational observation** obtains evidence from the deployed system in its actual environment, after exposure to consequences has begun.

No mechanism simply establishes that the software is correct. Each observes or reasons about different aspects of the system and leaves different uncertainty behind.

Dynamic testing introduces another choice: the validation strategy. Executing a program is usually cheap; deciding whether the result is correct can be difficult. The oracle available determines what kinds of search are practical. Example-based testing supplies known expected answers. Property-based testing states a property over many generated inputs. Metamorphic testing checks relationships among executions. Differential testing compares independently developed implementations. Fuzzing uses weak oracles such as crashes, hangs, and assertion failures to search enormous spaces of unusual inputs.

Choose the strategy for the uncertainty you need to reduce.

## How strong is the evidence?

Neither the name of a technique nor the quantity of evidence establishes its strength. Engineers must ask what the evidence actually supports.

Important dimensions include **coverage** — how much relevant behavior was examined; **detection power** — whether the evidence would expose the failure of interest; **representativeness** — whether the conditions resemble delivery; **scope** — whether the evidence attaches where the property exists; **independence** — whether several pieces of evidence share the same potentially mistaken assumption; and **residual uncertainty** — what consequential possibilities remain unresolved.

These distinctions matter increasingly as evidence becomes cheap to generate. Ten thousand tests derived from one mistaken interpretation are not ten thousand independent reasons to trust that interpretation. They are one reason, repeated.

## Measurement for decision-making

Measurement requires the same care. A useful chain is:

**Property → Metric → Measurement → Evidence → Judgment**

A metric defines how some aspect of a property will be assessed. A measurement applies that metric under particular conditions. The resulting value becomes evidence only through the property, metric, and conditions that give it meaning. A measured p99 latency of 420 milliseconds matters because, for example, an architectural model bounded that path at 500 milliseconds under a stated workload.

A disagreement between model and measurement is itself information. The implementation may be defective, an assumption may be false, the model may be incomplete, or the metric may not represent the property we thought it did.

## When is the evidence enough?

Evidence must ultimately support an action. For quantitative properties, engineers can reason about margin: the separation between expected or observed behavior and an unacceptable boundary. A system measuring 420 milliseconds against a 500-millisecond limit is in a different position from one measuring 499 milliseconds, even though both currently satisfy the requirement. The defensible margin must also account for relevant uncertainty in workloads, measurements, models, and operating conditions.

Not every software failure has a useful numerical margin. Software behavior is often discrete: one unexpected transition, malformed message, or missing authorization check can move execution onto a qualitatively different path. Engineers therefore also build containment into systems. Interfaces, isolation, permissions, transactions, resource limits, timeouts, staged rollout, and rollback do not prove that enclosed software is correct. They limit what an unanticipated failure can affect.

For quantitative uncertainty, ask how much margin remains. For discrete and unanticipated behavior, ask how far failure is permitted to propagate.

The final judgment considers the consequential claims, the strength of the evidence supporting them, remaining margin, containment, consequence, and reversibility. Several actions may follow:

- **Deliver** when the evidence justifies accepting the remaining uncertainty.
- **Gather more evidence** when additional information could materially change the decision.
- **Change the system** when reducing the risk is preferable to gathering more evidence about it.
- **Revisit an upstream decision** when the evidence exposes a problem with a requirement, specification, architecture, or design.
- **Refuse** when no available course makes delivery professionally defensible.

A failed validation therefore need not mean *test more*. Evidence can tell engineers that the implementation should change, that an architectural assumption was wrong, or that a commitment itself should be reconsidered.

Delivery does not end the argument. Operation produces new measurements, incidents, and observations, and changes to the software can invalidate evidence obtained for an earlier realization. Continuing to deliver is therefore another engineering decision under the evidence now available.

Validation turns evidence into engineering judgment: what must be true, what evidence bears on it, how strong is that evidence, and is it enough to act?

---

**Read the expanded treatment:** [*The Software Engineering Handbook*, "Validation" →](https://davisjam.github.io/model-based-agentic-software-engineering/book/se-handbook/08-validation.html)
