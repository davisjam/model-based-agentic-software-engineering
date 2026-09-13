---
id: process
title: Software Process
short_title: Process
order: 1
status: draft
description: >
  A software process orders the activities of building software. The right ordering is not universal;
  it is an engineering choice shaped by how much can be known in advance, how expensive change is, and
  whether partial systems can deliver value.
objectives:
  - Explain why no ordering of engineering activities is universally correct.
  - Reason about a process choice along the dimensions of foreknowledge, cost of change, and incremental value.
  - Relate the economics of process to the engineered medium.
---

**Premise.** *The engineered medium affects the engineering process.*

Software engineering involves many kinds of work. Engineers determine what a system should do, design
ways to accomplish it, implement those designs, evaluate the result, release it, repair it, and adapt it
as circumstances change. A software process organizes these activities.

::: {.definition #def-software-process title="Software process"}
A software process organizes engineering activities: deciding what to build, designing it, implementing
it, validating it, and learning from the result. There is no universally correct ordering of these
activities. Process is an engineering choice shaped by properties of the system and its environment.
:::

## The engineered medium shapes the process {#sec-medium-shapes-process}

@ch-software-engineering described software as an unusually changeable, copyable, transferable, and
updateable medium. Those properties do more than make software useful. They affect how it should be
engineered.

Imagine constructing a bridge one span at a time, opening each new span to traffic, observing how
drivers respond, and then using that feedback to decide how to design the next span. This sounds
absurd, and the absurdity is informative.

Bridge engineering certainly includes requirements, design, construction, and validation. The problem is
not that iteration or feedback are somehow foreign to civil engineering. The problem is that the physical
medium changes the economics and usefulness of particular arrangements. Some commitments are
extraordinarily expensive to reverse. A partially constructed bridge may provide little of the intended
value. Learning from ordinary use may come much too late.

Software has different properties. Because it is changeable, copyable, transferable, and updateable,
repeated cycles of construction, observation, and revision are unusually practical. We can build
something, run it, learn from it, change it, and distribute the changed version — sometimes in minutes.

But software is not uniformly changeable. A line of internal implementation may be easy to replace. An
API used by hundreds of clients is not. A data representation becomes harder to change after billions of
records have been stored in it. An architectural choice becomes harder to reverse as other choices
accumulate around it. Certification, external integrations, deployed dependencies, and organizational
commitments can turn an initially flexible software decision into an expensive one.

The useful question is therefore not simply, "Is this software?" It is: *What properties of this
particular engineering problem should determine how we organize the work?*

## Two ways to arrange the same work {#sec-two-ways}

Consider two familiar process families. In a strongly plan-driven process, work is organized
primarily by engineering activity. Requirements are
established across much of the product before substantial design; design precedes much of the
implementation; implementation precedes final validation and release. Progress between stages normally
requires some evidence that the preceding work is sufficiently complete.

This does not mean that engineers are forbidden to go backward. Implementation may expose a design error.
Validation may expose a misunderstood requirement. Rework occurs. The important feature is that the
process makes relatively large commitments to one kind of engineering work before proceeding to the next.

An incremental process partitions the work differently. Instead of moving the whole product through
requirements, design, implementation, and validation, engineers take a smaller product increment through
those activities. Then they take another increment through them. The activities have not
disappeared; their arrangement has changed.

::: {.note title="Activity versus increment"}
A strongly plan-driven process partitions work primarily by engineering activity. An incremental process
partitions work more strongly by product increment.
:::

These are not mutually exclusive. A project might establish substantial system requirements and
architecture up front while designing, implementing, and validating individual capabilities
incrementally.

This distinction is more useful than treating "Waterfall" and "Agile" as competing doctrines. The
engineering question is why one partitioning of the work makes more sense than another.

## A model for process choice {#sec-model-process-choice}

Plan-driven and incremental development give us alternatives, not an answer. Choosing between them requires
reasoning about the engineering problem.

A useful model begins with three questions:

- What can we know before we build?
- How expensive is it to change what we build?
- Can a partial system be validated or deliver value?

These dimensions explain why no methodology is universally appropriate: different systems occupy
different points in this space.

## Certainty: what can we know before we build? {#sec-certainty}

Planning has value when it lets us act on information we already possess. At one extreme, the
problem is stable and well understood. Important requirements and constraints can be established
before implementation. Engineers can reason about them, detect conflicts, and design around them
before committing resources to a realization.

At the other extreme, some consequential information does not yet exist. Consider a new consumer
application. Engineers can specify that it needs accounts, search, location
services, or a particular interaction. They may nevertheless be unable to predict which capabilities
users will actually value, how users will behave, or which apparently minor feature will become
important. Interviews and analysis can reduce this uncertainty, but some information may emerge only when
people use a working system.

In such a case, implementation does more than produce the product. It produces information. That changes
the value of iteration. Building an increment, observing it, and revising the system is useful when the
observation changes what engineers know about what they should build next.

::: {.decision #decision-certainty title="Certainty"}
Ask: What consequential information is available before implementation, and what can only be learned by
building?

When important knowledge is available in advance, exploit it through planning. When important knowledge
emerges through construction and use, create feedback loops that expose it early.
:::

Uncertainty is not itself a failure. The process needs a way to resolve the uncertainty that matters.

## Changeability: how expensive is it to change our minds? {#sec-changeability}

@ch-software-engineering identified changeability as a defining advantage of software. Here we encounter
its process consequence: when changing a decision is cheap, committing to it early has less value.

Suppose an engineer can spend three days determining the perfect value for a configuration parameter or
choose a reasonable value now and change it in twenty minutes tomorrow. Extensive up-front analysis may
cost more than being wrong.

Now suppose the decision concerns a public interface that hundreds of systems will depend upon. Being
wrong may require coordinated changes across organizations years later. More reasoning before commitment
becomes much cheaper than reversal afterward.

The relevant quantity is therefore not simply the cost of making a decision. It is the cost of changing
that decision after commitment.

Software decisions occupy a wide range. UI text, configuration, local algorithms, and isolated
implementation details may be inexpensive to revise. Interfaces, persistent data representations,
architectural boundaries, security protocols, external integrations, and certified behavior can become
expensive or effectively irreversible.

This is also where copyability and updateability cut both ways. They can make a repair extraordinarily
cheap to distribute: one corrected implementation can replace millions of deployed copies. But widespread
deployment can also create enormous dependence on existing behavior. A decision that was cheap before
release may become expensive once other systems, users, data, and organizations rely upon it.

::: {.decision #decision-changeability title="Changeability"}
Ask: How expensive will this decision be to reverse after we make it?

Expensive commitments justify greater reasoning before commitment. Cheap and reversible choices permit
more experimentation and correction.
:::

Or, in intentionally simplified form: if it is expensive to change, try to get it right before
committing; if it is cheap to change, do not spend more avoiding error than the error costs to correct.

This is one reason software can support processes that would be uneconomical for many physical systems.
The medium gives engineers more opportunities to make provisional decisions. Good software engineering
can create still more of them.

## Decomposability: how much must we build at once? {#sec-decomposability}

The third question concerns partial systems. A half-completed bridge does not provide half the
transportation value of a completed bridge. But many software systems can be divided into portions
that are meaningful before the entire envisioned system exists, and there are actually two
different thresholds at which a portion becomes meaningful.

First, a partial system may be validatable. It may not yet provide useful service, but engineers can
build it, test it, measure it, or place it in a realistic environment. Doing so creates information about
whether assumptions, interfaces, or designs are correct.

Second, a partial system may be useful. An online store might provide search and basic checkout before
recommendations, wish lists, or every payment method exist. Users can receive value from the partial
system while engineers continue developing the rest.

The distinction matters. Incremental construction can be worthwhile even when an increment cannot yet be
released, because validation can reduce uncertainty. If the increment can also deliver useful value, the
case for incremental development becomes stronger.

::: {.decision #decision-decomposability title="Decomposability"}
Ask two questions: Can a partial system produce useful evidence? Can a partial system produce useful
outcomes?

The smaller the portion required for either, the more opportunities the process has for early learning.
Independent usefulness additionally creates opportunities for incremental delivery.
:::

A partial realization that can generate information or value is what makes incremental work pay off;
software's updateability then lets later increments revise what has already been deployed.

## Consequence of failure is a different question {#sec-consequence}

One apparently obvious factor is absent from the three dimensions: how bad would failure be? That
omission is deliberate.

Suppose a failure could cause serious harm. Does that tell us whether the requirements can be known before
implementation? No. Does it tell us whether a design decision is cheap to reverse? No. Does it tell us
whether a partial system can be meaningfully validated? Again, no. A consequential system can lie
anywhere on each of the three dimensions.

Consequence instead answers a different engineering question: how much evidence should we demand before
accepting the system or a change to it? A low-consequence product might reasonably release an
imperfect capability, observe its behavior, and
repair problems afterward. That is not an acceptable strategy when a corresponding failure could injure
someone. The latter system requires stronger evidence before the change is permitted to affect the world.

::: {.note title="Process and assurance"}
Certainty, changeability, and decomposability help determine how to organize the work. Consequence helps
determine how much assurance to require before accepting the work.
:::

Do not confuse a need for strong assurance with a requirement for one particular process model. This
distinction will matter throughout the handbook. Highly iterative development and rigorous assurance are
not opposites. The process determines how engineering work is organized; assurance determines what
evidence must accompany consequential decisions.

## The dimensions in practice {#sec-dimensions-in-practice}

Certainty, changeability, and decomposability explain why superficially similar projects can rationally
use different processes. Consider a consumer application whose success depends strongly on user
preferences. Some important
requirements will emerge through use. Many product decisions can be revised comparatively cheaply. Useful
portions of the product can be released independently. These conditions favor small commitments, active
feedback, and frequent iteration.

Now consider software embedded in a complex aircraft system. Many consequential obligations and
interfaces can be established in advance. Hardware integration, deployed equipment, certification, and
dependencies make some decisions expensive to reverse. Subsystems can be developed and validated
independently, but useful operational capability ultimately depends on their successful integration.
These conditions create stronger reasons for explicit up-front requirements and interfaces, carefully
controlled commitments, and substantial verification before changes are accepted.

Both systems can iterate. Both can prototype. Both can plan. The conclusion is not that consumer
applications use Agile while aircraft use Waterfall. The conclusion is that the properties of the
engineering problem determine the value of different arrangements of work.

## Engineers can move the dimensions {#sec-move-dimensions}

The three dimensions are not merely properties that engineers inherit. They are also properties that
engineers can sometimes change.

If uncertainty is too high, engineers can invest in certainty. They can study the domain, interview
stakeholders, construct prototypes, run experiments, model important relationships, or validate
assumptions before making expensive commitments.

If decisions are too expensive to reverse, engineers can invest in changeability. Modularity can isolate
decisions. Interfaces can prevent assumptions from spreading. Automated tests can reduce the cost of
checking a revision. Continuous integration can make small changes easier to evaluate. Loose coupling can
reduce the number of components affected when one component changes.

If a system must be nearly complete before anything can be learned or used, engineers can invest in
decomposability. They can establish interfaces that permit components to be tested separately, identify
vertical slices that provide end-to-end behavior, or restructure responsibilities so that capabilities
can evolve independently.

These investments are themselves engineering decisions. A more modular architecture may be easier to
change but harder to understand or operate. Independently deployable components require infrastructure.
Prototypes consume time. Extensive requirements analysis can delay feedback. Automated validation costs
money to create and maintain.

::: {.decision #decision-move-dimensions title="Move the problem or adapt to it?"}
First ask where the project lies on certainty, changeability, and decomposability. Then ask whether it is
worth moving any of them.

Engineering can increase what we know before commitment, reduce the cost of changing our minds, and
create smaller units from which we can learn or deliver value. But moving those dimensions has a cost.
Invest when the resulting flexibility, information, or control is worth more than the investment required.
:::

## Closing {#sec-closing}

Software engineering therefore does more than exploit the changeability of its medium. Engineers
deliberately change the economics of future change. Requirements work can reduce uncertainty before
commitment. Architecture and design can make some changes cheaper and more independent. Validation
infrastructure can make revisions cheaper to evaluate. A good process takes advantage of these properties
rather than assuming them.

Choosing a process is therefore not simply a matter of asking, What kind of project do we have? It also
asks, What kind of project is it worth engineering this into?

## Summary

A software process is an arrangement of engineering work, not a universal sequence of phases. The
appropriate arrangement depends on the problem and on the properties of the engineered medium. Three
questions are especially useful: how much can we know before building, how expensive will our decisions be
to change, and how much can we learn from or deliver through a partial system?

These dimensions explain why plan-driven and incremental arrangements can both be rational. Consequence of
failure is a separate question: it determines how much assurance we require, not by itself how work should
be partitioned. Engineers can also change the dimensions by investing in knowledge, changeability, and
decomposability. Process choice therefore asks both what kind of project we have and what kind of project
it is worth engineering this into.

::: read_further
Sommerville, Ian. *Software Engineering*. 10th ed. Boston: Pearson, 2016. A clear survey of plan-driven and incremental process models that treats them as engineering responses to different problems rather than as competing doctrines.

Boehm, Barry, and Richard Turner. *Balancing Agility and Discipline: A Guide for the Perplexed*. Boston: Addison-Wesley, 2003. Frames how much up-front discipline versus later adaptation a project needs as a tradeoff driven by the cost of change and the characteristics of the problem — the cost-of-change reasoning this chapter builds on.

Winters, Titus, Tom Manshreck, and Hyrum Wright. *Software Engineering at Google: Lessons Learned from Programming Over Time*. Sebastopol, CA: O'Reilly Media, 2020. Argues that what distinguishes software engineering from programming is the artifact's life across change; the reason a process must plan for revision, feedback, and evolution rather than a single act of construction.
:::
