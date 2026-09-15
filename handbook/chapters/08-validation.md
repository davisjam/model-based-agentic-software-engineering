---
id: validation
title: Validation
short_title: Validation
order: 8
status: draft
description: >
  Validation asks what evidence is sufficient to deliver a software system into the world. Three
  inputs shape that decision — the consequences at stake, the judgment of stakeholders, and the
  engineer's independent professional judgment — and none can be substituted for the others. The
  decision recurs after delivery as operational evidence accumulates.
objectives:
  - Distinguish consequence, stakeholder judgment, and professional judgment as separate inputs to the delivery decision, and recognize the two pathologies of a mismatched standard.
  - Identify the claim a validation activity must support before selecting a technique, and choose techniques by the uncertainty each can reduce.
  - Evaluate the strength of a body of evidence — its coverage, representativeness, independence, and assumptions — rather than its volume.
  - Recognize when evidence gathered after delivery has changed the justification for continued delivery.
---

**Premise.** *Validation asks what evidence is sufficient to deliver a software system into the
world.*

Engineering decisions flow from purpose through requirements, specification, architecture, design,
and implementation. At each point, engineers make choices for which they are responsible.
Eventually those choices produce software that can be delivered. The engineer must decide whether
there is enough reason to proceed.

This makes validation broader than testing. Tests are one way to obtain evidence about a system,
but the engineering question comes first: What do we need to know before we are willing to deliver
it? A review may provide useful evidence about a design. Static analysis may provide evidence about
possible program behaviors. Measurement may establish whether a performance objective has been met.
A proof may establish a property under stated assumptions. Different claims require different
evidence.

Nor does validation necessarily seek certainty. Software is unusually updateable.
@ch-software-engineering showed how an engineer can change one codebase and propagate the result
across an enormous deployed population. The same property that spreads mistakes also makes repairs
cheap to distribute. @ch-process drew one consequence: when a decision is cheap to reverse,
engineers can experiment rather than spend more avoiding an error than the error would cost to
correct.

The same reasoning applies to delivery. Sometimes it is better to deliver software with known
uncertainty, observe what happens, and revise it. A game can ship with an occasional graphical
defect. An internal tool can be useful despite awkward workflows. A consumer application may need
to reach users before its engineers can learn which capabilities people actually value. In these
cases, delaying delivery until every known uncertainty has been resolved can cost more than
learning from use.

In that limited sense, *move fast and break things* describes a real engineering strategy. It is
not always irresponsible to deliver software that might fail. The engineering question is whether
discovering the failure after delivery is an acceptable way to learn.

That qualification matters because software's updateability repairs the software, not necessarily
the consequences of its previous behavior. An update can correct a graphical defect after players
encounter it. It cannot necessarily recover money already lost, make disclosed information private
again, or reverse a physical injury. As the consequences of being wrong become more substantial or
less reversible, learning through failure becomes more expensive.

@ch-process deliberately left consequence of failure out of its model for organizing engineering
work. Consequence does not tell us whether requirements can be known in advance, whether a decision
is expensive to reverse, or whether a partial system can be built and validated. It answers a
different question: how much assurance should we demand before delivery?

That is the question of this chapter.

## Acceptance is a professional judgment {#sec-professional-judgment}

Consider three software defects. A game sometimes draws a character incorrectly. A TODO application
occasionally loses a task. A medical device can sometimes deliver an incorrect dose.

These defects differ in more than severity. The game defect may directly annoy a player, but more
serious consequences require a longer causal chain. The TODO application destroys information on
which a user may depend: the lost task might cause the user to miss an appointment or deadline. The
medical device can directly injure its user. The more substantial and direct the possible
consequence, the stronger the reason to reduce uncertainty before delivering the system.

Causal distance matters because almost any software behavior can be connected to serious harm
through a sufficiently long chain. A broken game may frustrate a player, and frustrated people
sometimes behave badly. That possibility does not make an ordinary graphical defect
safety-critical. Engineers need to reason about consequences that are sufficiently substantial and
sufficiently connected to the software to matter to the delivery decision.

This does not imply that consequential systems must be perfect. Engineering rarely offers
certainty, and useful systems can carry residual risk. Nor does consequence mechanically determine
how much risk is acceptable. Two people can agree completely about what might happen and disagree
about whether the available evidence justifies delivery.

Suppose, for example, that everyone agrees that a particular failure could kill people. The
organization building the system may understand that consequence and nevertheless judge the
residual risk acceptable because of the benefit the system provides. A regulator may permit the
system under the same understanding. An engineer may still conclude that the available evidence is
not strong enough to justify delivery.

The disagreement is not about what the consequence is. It is about what that consequence requires.

At least three things therefore contribute to the standard applied at delivery. Consequences
establish what is at stake if the engineering judgment is wrong. Stakeholders judge what outcomes,
costs, and risks they are willing to accept. Engineers exercise an independent professional
judgment about what the available evidence allows them to stand behind. These judgments often
agree, but none can simply be substituted for the others.

The last judgment takes us to professionalism. Engineers do not act only as employees carrying out
the preferences of whoever controls a project. They also act as members of a profession.

::: {.definition #def-professionalism title="Professionalism"}
Professionalism is the exercise of specialized capability under obligations that are not reducible
to the wishes of whoever asks you to use it.

A customer may be willing to accept a structural risk that an engineer judges inadequately
understood. The customer's willingness does not require the engineer to certify the structure. The
same distinction applies to software: another party may have authority to accept a risk without
thereby determining what an engineer can responsibly claim about the system or requiring the
engineer to participate in delivering it.
:::

A profession exists partly because specialized decisions cannot always be made well by the people
who want the resulting system. Society relies on physicians to exercise medical judgment rather
than merely supply requested treatments, and on engineers to exercise engineering judgment rather
than merely realize requested artifacts. Professional communities accumulate standards, methods,
experience, and expectations about what their members should be prepared to stand behind.
Individual engineers draw upon those accumulated judgments when they exercise professional
authority.

Professional judgment is therefore different from personal preference. Suppose a customer needs a
disposable internal tool by Friday. Its failures have minor consequences, and the customer can
tolerate occasional errors. An engineer might prefer to spend another six months making the
software extraordinarily reliable. That preference does not make the additional work good
engineering. Time and money spent eliminating inconsequential uncertainty cannot be spent
elsewhere.

The opposite disagreement is more serious. Suppose a system can kill people when it fails. The
customer wants to proceed, but the engineer believes the available evidence does not justify
delivery. The customer's willingness to bear the risk does not end the engineer's responsibility.
The engineer may need to obtain stronger evidence, change the system, leave the decision to someone
with the necessary competence, or refuse the work.

These cases expose two different pathologies. An engineer can demand substantially more assurance
than the consequences and stakeholder needs warrant, producing perfection at a cost that does not
justify it. Or an engineer can demand less assurance than the consequences warrant and become
willing to deliver work that the engineer should not stand behind. Good engineering lies in neither
direction. It seeks a defensible standard for the decision actually being made.

The relationship can be summarized as follows:

|  | Engineer accepts a lower standard | Engineer demands a higher standard |
|---|---|---|
| **Consequences are substantial** | Professional failure. The engineer's standard is inadequate to what is at stake. | Appropriate rigor, when the additional work materially reduces consequential uncertainty. |
| **Consequences are minor** | Often appropriate. Good enough may actually be good enough. | Overengineering, when additional assurance consumes resources without commensurate value. |

This table intentionally simplifies the stakeholder's role. Stakeholders help determine what the
software needs to accomplish and which ordinary failures they are willing to tolerate. They may
also participate in broader decisions about acceptable risk. The table isolates a different
comparison: whether the engineer's own standard is appropriate to the consequences the engineer
understands.

Professional authority matters most when those judgments diverge. A customer, employer, regulator,
or government may be willing to accept a risk that an engineer is not willing to accept. Their
willingness does not erase the engineer's responsibility for the engineering judgment. The engineer
may refuse to certify the result and may ultimately refuse to use their professional capabilities
to produce or deliver it.

This does not put engineers above society. Engineers do not acquire general authority over what
purposes other people may pursue merely because those purposes involve technology. But political,
organizational, and economic authority do not replace local engineering judgment either. Other
people can make decisions within their authority. They cannot make an engineer possess evidence the
engineer does not have, nor can they require the engineer to stand behind a judgment the engineer
cannot defend.

Professional authority therefore includes the ability to say no.

Validation makes this responsibility especially visible because delivery requires a decision.
Professional responsibility does not begin there. An engineer who recognizes a dangerous omission
in the requirements cannot knowingly preserve it on the theory that validation will catch the
problem later. The same is true of an indefensible specification, architectural decision, or
design. Each engineering activity carries responsibility for the decisions made within it.

Validation is nevertheless special because earlier decisions meet evidence there. Requirements
establish what the engineering effort promised. Specification bounds what would satisfy those
promises. Architecture and design determine how one realization is organized and how its parts
fulfill their responsibilities. Implementation gives engineers a realization they can inspect,
exercise, measure, analyze, and sometimes deliver provisionally to learn from use. Evidence can
reveal an implementation defect, but it can also expose an architectural weakness, a missing
distinction in the specification, or a requirement that does not serve its purpose. This continues
the book's existing principle that decisions flow downward while engineering learning moves upward
(@ch-design).

The distinctive question at validation is whether the evidence is enough to deliver.

## Consequence changes the amount of evidence we should demand {#sec-consequence-evidence}

A useful starting point is what could happen if the delivery decision is wrong. Suppose a TODO
application loses one task in every thousand. Whether that behavior warrants delaying delivery
depends partly on what the application is for. A personal scratchpad may tolerate the loss. A task
system used to coordinate emergency maintenance may not. The same observed failure rate can justify
different decisions because the consequences attached to the lost information differ.

::: {.definition #def-consequence title="Consequence"}
A consequence is an effect in the world that can result from an engineering decision or system
behavior.

An incorrect dose produced by a medical device can directly injure a patient. A lost TODO item can
matter because a user later acts without information they expected the system to preserve. A
graphical defect in a game may do little beyond frustrating the player. The effects differ in
severity and in how directly the software produces them.
:::

Consequences give engineers a reason to demand more or less assurance, but they still do not
determine a unique threshold for delivery. Someone must judge what evidence is sufficient given
what is at stake.

That judgment also changes as engineers learn. Before delivery, a harmful outcome may be a
possibility supported by stronger or weaker evidence. Delivery itself can then produce information.
Engineers can observe failures, measure outcomes, receive reports from users, and discover
consequences they did not predict. This is one reason delivering under uncertainty can be valuable
when the possible consequences are modest: use generates knowledge that might have been expensive
or impossible to obtain beforehand.

But new evidence changes the engineering decision. Suppose engineers initially believe that a
deployed feature is unlikely to cause substantial harm. Later evidence indicates that it is causing
such harm. The justification for the original delivery cannot simply be reused. Continuing to
deliver the same behavior is now a new decision made with different knowledge.

This distinction is especially important for software because updating is often possible. Engineers
can respond to evidence by changing behavior across a deployed population quickly. That capability
makes learning after delivery more practical, but it also removes one excuse for ignoring what has
been learned. If engineers know that deployed behavior is causing substantial harm and can change
it, continued operation requires a justification under that new state of knowledge.

Validation therefore does not end with the first delivery. Evidence continues to flow upward from
the behavior of the deployed system, and consequential evidence should cause engineering decisions
to be reconsidered.

The question remains the same even as the evidence changes: Do we know enough to justify what we
are about to deliver?

The next step is to make *know enough* precise. Before choosing tests, analyses, reviews, or other
validation techniques, engineers need to identify what they are actually trying to establish.

## Claims and evidence {#sec-claims-evidence}

Before choosing a validation technique, identify the claim that needs support. Saying that a system
has "been tested" tells us little until we know what the tests were intended to establish.

A payment service might need to support several different claims. A payment submitted once should
not be charged twice. An unauthorized user should not be able to initiate a payment. A completed
payment should appear in the account history. A normal request should complete within an acceptable
time. Each claim concerns the same system, but evidence that supports one may say little about
another.

This is why validation techniques should not be taught as a catalog from which engineers select a
sufficiently impressive collection. The engineering problem runs in the other direction. Engineers
first identify what they need to believe, then consider how the system could violate that claim,
and finally seek evidence capable of distinguishing the acceptable behaviors from the unacceptable
ones.

If the claim concerns duplicate charging, engineers need evidence capable of exposing duplicate
execution under the conditions in which it might occur. If the claim concerns latency, they need
measurements under relevant workloads and environments. If the claim concerns behavior over all
possible values of some bounded input, exhaustive analysis or proof may provide evidence that
ordinary examples cannot.

The method follows from what engineers need to know.

A claim is distinct both from the artifact it concerns and from the technique that supports it. The
same artifact can carry many claims, and the same technique can support claims of quite different
kinds. Requirements and specification supply the obvious claims: requirements state what the
engineering effort promised, and specification bounds the behaviors that would count as keeping
those promises. But architecture and design create claims of their own. An architecture that
promises failure isolation is claiming that a fault in one part cannot corrupt another. A design
that defers work to a queue rests on the claim that the same operation can safely execute twice
(@ch-design). These claims rarely appear in any requirements document, yet the system depends on
them, and some of the most expensive failures violate an assumption that nobody thought to state as
a claim worth checking.

Evidence, in turn, is always evidence *for* something, under assumptions. The assumptions should be
made explicit, because they bound what the evidence can mean. A proof can strongly establish a
stated property relative to its model while saying nothing about a requirement omitted from that
model. A load test establishes latency under the workload it generated, not under the workload
users will generate. Treating "we have strong evidence" as a property of the system, rather than of
particular claims under particular assumptions, is how validation programs mislead the people who
rely on them.

The world, machine, and domain-assumption distinction from @ch-specification returns here with new
force. Most validation evidence attaches to the machine: tests, analyses, and proofs establish
claims about behavior at the machine's boundary. But requirements live in the world, and the
connection between them runs through domain assumptions [@zave1997darkcorners]. A system can
satisfy its specification perfectly while its requirement fails because a domain assumption was
false. No amount of machine-side evidence can expose that failure, because the machine is behaving
exactly as specified. Evidence about the world — observation of the deployed system operating in
its actual environment — can. This is one reason operational evidence, taken up at the end of this
chapter, is a constituent of validation rather than an afterthought.

## Choosing among sources of evidence {#sec-choosing-evidence}

Once the claim is explicit, validation techniques become alternatives for producing evidence about
it. The useful question about each is its mechanism: what kind of uncertainty can it reduce, which
failures can it expose or exclude, and what remains outside its reach.

- **Review** brings another engineer's knowledge and judgment to an artifact. It can expose
  reasoning errors the author cannot see and consequences the author did not consider. Nothing in
  the mechanism forces either person to consider a behavior neither imagined.
- **Example-based testing** exercises selected behaviors against expected results. It is direct and
  cheap when the important cases and their expected outcomes are known, and silent about every case
  not selected.
- **Property-based testing** states a property that should hold across a class of inputs and
  searches that class for counterexamples. The engineer trades hand-picking examples for the harder
  work of stating what should be true in general.
- **Differential testing** compares independently developed implementations on the same inputs.
  Disagreement flags something worth investigating, which makes it valuable exactly when the
  correct answer is expensive to state case by case.
- **Fuzzing** explores large or unusual input spaces to find behaviors the engineer did not
  anticipate. It needs only a weak notion of failure — a crash, a hang — so it exposes robustness
  failures cheaply while saying little about functional correctness.
- **Static analysis and model checking** reason about possible behaviors without producing each one
  through execution. They can *exclude* whole classes of failure — something no finite set of
  executions can do — but only over the model or abstraction they analyze.
- **Measurement and experimentation** establish quantitative claims: whether a latency budget
  holds under a workload, whether users complete a task, whether one variant outperforms another.
  The evidence is only as good as the workload's or experiment's resemblance to reality.
- **Operational observation** watches the deployed system itself, in the one environment no
  earlier technique can fully reproduce. Its evidence arrives after the consequences have begun.

Several of these techniques answer the same underlying difficulty, the *oracle problem*: engineers
can often generate inputs far more cheaply than they can state the correct output for each one.
Property-based testing responds by stating the expected answer as a property. Differential testing
lets an independent implementation flag the suspicious case. Model checking states the property
over an explicit behavioral model and searches the state space for a violation. Recognizing the
shared problem matters more than memorizing the techniques, because the next technique an engineer
encounters will be answering it too.

## The strength of evidence {#sec-strength-of-evidence}

No technique supplies confidence by its name alone. A model checker can exhaustively verify a
property of the model while leaving an incorrect model untouched. Thousands of generated tests can
explore an input space while sharing the same mistaken oracle. A code review can bring independent
judgment while still missing behavior that neither reviewer considered. Evidence must be evaluated
relative to the claim it supports and the assumptions on which it depends.

Evaluating a body of evidence is itself an engineering judgment, and a few questions structure it.
What portion of the claim's space did the evidence actually exercise, and what portion did it
never touch? Do the exercised conditions resemble the conditions of delivery, or a convenient
laboratory version of them? Do the pieces of evidence rest on distinct assumptions, or do they all
inherit the same one? Where a technique claims soundness or completeness, what exactly do its
verdicts guarantee, and over what model? What uncertainty remains after all of it, and is that
residual acceptable for this decision? Strong validation for consequential claims tends toward
triangulation: multiple forms of evidence whose failure modes are uncorrelated, so that a mistaken
assumption in one is caught by another.

Independence deserves particular attention, because volume imitates it well.

::: {.key-idea #key-evidence-independence title="Evidence multiplies; independence does not"}
A thousand tests generated from the same mistaken interpretation of a requirement are not a
thousand independent reasons to believe the interpretation is correct. They are one reason,
repeated. The strength of a body of evidence grows with the diversity of the assumptions it rests
on, not with its count.
:::

This point has become more important, not less, as generation has become cheap. When tests were
expensive to write, each one embodied a deliberate act of engineering attention, and a large suite
loosely signaled substantial scrutiny. When a tool can generate implementations and thousands of
passing tests from the same prompt, the tests and the implementation can share a single mistaken
interpretation, and the suite's size signals nothing about it. @ch-software-engineering argued that
as implementation becomes abundant, the judgments surrounding it become relatively more important.
The same shift applies inside validation: cheap evidence generation makes *judging* evidence — its
coverage, its representativeness, its independence, its assumptions — the scarce engineering work.

## Deciding when to stop {#sec-when-to-stop}

Additional evidence always has a cost: the effort of producing it, the attention of evaluating it,
and the delay it imposes on whatever value delivery would create. @ch-process observed that
delivering an increment can itself generate information. Withholding delivery to buy more evidence
therefore has a price on both sides of the ledger, and the mismatch table from earlier in this
chapter applies to it directly. For a low-consequence system, delivering with unresolved
uncertainty can be the defensible choice, and demanding near-certainty is the pathology:
overengineering, resources consumed without commensurate value. For a high-consequence system, the
same unresolved uncertainty may justify expensive and diverse evidence, or it may mean that
delivery cannot currently be defended at all.

The decision at the end of validation is also not binary. Evidence that fails to justify delivery
does not merely say "stop"; it usually says something about where the problem lies, and the
response should go there.

::: {.decision #decision-validation-outcomes title="The delivery decision"}
Deliver, when the evidence supports the claims that matter at a standard defensible for the
consequences. Gather more evidence, when the shortfall is knowledge and the evidence is worth its
cost. Change the system, when the evidence has exposed behavior that should not be delivered.
Revisit an upstream decision, when the evidence indicts a requirement, specification, architecture,
or design rather than the implementation. Refuse, when the consequences demand a standard the
available evidence cannot meet and no party can make that gap disappear by accepting it.
:::

The last option needs no new argument; it is the professional authority of this chapter's opening
applied at the moment it matters. Throughout, the three inputs remain distinct. Consequence
establishes what is at stake. Stakeholders judge which outcomes, costs, and risks they will
accept. The engineer judges what the evidence allows them to stand behind. A delivery decision is
defensible when it can answer to all three, and the disagreements worth having are usually about
the third: everyone can agree on what a failure would do and still disagree about what evidence
its possibility demands.

## Evidence after delivery {#sec-after-delivery}

Delivery moves the system into the one environment no earlier validation could fully reproduce, and
the environment repays the favor with evidence. Monitoring reveals behavior under real workloads.
Incidents expose failures no one selected as a test case. Field measurements and experiments
quantify what analysis could only estimate. User reports carry consequences engineers did not
predict. And the world itself changes: a domain assumption that was true at delivery can quietly
become false as usage, populations, and conditions shift. Operational observation is therefore not
a courtesy that follows validation. It is validation continuing under better evidence.

The crucial judgment is that the decision must update when the evidence updates. It is one thing to
deliver amid uncertainty about a possible harm; the uncertainty was weighed, and the decision may
have been sound. It is a different thing to continue delivering the same behavior after evidence of
substantial harm has accumulated. The original justification cannot be reused, because it was a
justification under a state of knowledge that no longer exists.

Recent litigation against social-media companies illustrates the distinction, if it is read
carefully. Plaintiffs — including states and school districts — have alleged that platform design
features harmed young users, and that the companies continued delivering those features after
internal evidence of harm had accumulated. The careful reading matters because legal artifacts
establish different things: an allegation is a claim awaiting test, a verdict resolves a legal
question under a legal standard, and a settlement may reflect a risk calculation rather than a
factual concession. None of them is scientific proof of causation, and this chapter takes no
position on the underlying social-science debate. The engineering lesson does not depend on it.
Whatever the eventual adjudication, the shape of the accusation is exactly the failure this section
names: not *you delivered under uncertainty*, but *your evidence changed and your decision did
not*.

Software's medium gives this duty its particular force. @ch-software-engineering observed that
copyability and updateability cut both ways: the same mechanism that propagates a repair across
millions of instances propagates a defect across them too. Validation supplies the corresponding
judgment. Updateability is what makes learning after delivery a legitimate strategy when failures
are tolerable — the repair really can reach everyone cheaply. And updateability is what makes
inaction hard to defend when failures are not tolerable, because engineers of deployed software
hold an unusual power: once evidence shows that deployed behavior should change, they can change
it, everywhere, quickly. An engineer who could respond and does not has made a decision, and it is
a decision that must be justified under the new state of knowledge.

## Summary

Validation asks what evidence is sufficient to deliver a software system into the world. The
question is broader than testing, and it does not demand certainty: software's updateability makes
delivering under known uncertainty and learning from use a legitimate strategy, but only when
discovering a failure after delivery is an acceptable way to learn, because an update repairs the
software, not the consequences of its previous behavior.

Three inputs shape the standard applied at delivery, and none substitutes for the others.
Consequences establish what is at stake, weighed by severity and by causal distance. Stakeholders
judge which outcomes, costs, and risks they will accept. Engineers exercise an independent
professional judgment about what the available evidence allows them to stand behind — a judgment
that can fail in either direction, by demanding more assurance than minor consequences warrant or
less than substantial ones require. People can agree entirely about a consequence and still
disagree about what evidence it demands.

The evidence itself starts from claims, not techniques. Engineers identify what they need to
believe — including the claims and assumptions created by architecture and design, not only those
written in requirements — then choose among sources of evidence by mechanism: what uncertainty each
can reduce and what remains outside its reach. The strength of the result is judged by coverage,
representativeness, independence, and assumptions rather than volume; a thousand tests sharing one
mistaken interpretation are one reason, repeated, and cheap evidence generation has made judging
evidence the scarce work. The decision that follows is not binary — deliver, gather more evidence,
change the system, revisit an upstream decision, or refuse — and it recurs after delivery, because
operational evidence keeps arriving and a justification made under an old state of knowledge cannot
be reused under a new one.

::: read_further
Winters, Titus, Tom Manshreck, and Hyrum Wright, eds. [*Software Engineering at Google: Lessons
Learned from Programming Over Time*](https://abseil.io/resources/swe-book). Sebastopol, CA:
O'Reilly Media, 2020. An account of how engineers obtain evidence at different scopes, from review
through unit tests to larger-scale testing. Read the "Code Review" chapter (chap. 9) and the
testing chapters (chaps. 11–14).

Cockx, Jesper. ["An Introduction to Property-Based Testing with
QuickCheck"](https://jesper.sikanda.be/posts/quickcheck-intro.html) (2020). Introduces
property-based testing: state properties that should hold across a class of inputs, then generate
inputs in search of counterexamples. The Haskell syntax is incidental; the validation strategy is
not. For the technique's origin, see Claessen and Hughes, ["QuickCheck: A Lightweight Tool
for Random Testing of Haskell Programs"](https://doi.org/10.1145/351240.351266) (ICFP 2000); for a
contemporary application in an agentic setting, see Anthropic, ["Finding bugs across the Python
ecosystem with Claude and property-based
testing"](https://www.anthropic.com/research/property-based-testing) (2026).

McKeeman, William M. ["Differential Testing for
Software."](https://www.cs.tufts.edu/comp/150FP/archive/bill-mckeeman/DifferentailTesting.pdf)
*Digital Technical Journal* 10, no. 1 (1998): 100–107. Introduces differential testing:
independently developed implementations serve as partial oracles for one another.

Palshikar, Girish Keshav. ["An Introduction to Model
Checking."](https://webdocs.cs.ualberta.ca/~paullu/C605/EMS-2004-02-12.pdf) *Embedded Systems
Programming*, February 2004. An accessible introduction to model checking and the evidence
obtained by exhaustively checking a model.
:::
