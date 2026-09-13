---
id: architecture
title: Software Architecture
short_title: Architecture
order: 5
status: draft
description: >
  Architecture organizes one acceptable realization so that its obligations can coexist. Its
  decisions are consequential: they allocate coupling and coordination, and they are defended by
  eliminating invalid and dominated candidates, naming the remaining tradeoffs, and buying evidence
  when it could change the choice.
objectives:
  - Explain what an architectural decision accomplishes that a specification leaves open.
  - Evaluate a proposed boundary by the coupling and coordination it allocates.
  - Defend an architectural choice by eliminating invalid and dominated candidates, naming the remaining tradeoff, and buying evidence when worthwhile.
  - Treat architectural patterns as candidate organizations with expected consequences, not answers.
---

**Premise.** *Architecture organizes one acceptable realization so that its obligations can
coexist.*

Specification tells us which realizations we would accept. It deliberately leaves many choices
open. Architecture begins when engineers select one acceptable realization and decide how it should
be organized.

A specification may separately describe allowable states, required ordering, valid information,
timing bounds, privacy obligations, expected changes, and other properties. Those separate views
make individual obligations easier to reason about. But nobody ships a collection of views. The
implemented system must realize them together.

State transitions run on the same processors that must satisfy timing obligations. Data described
by a schema lives in the same storage governed by privacy requirements. Components that must remain
independently changeable may also need to coordinate at runtime. Architecture is where these
obligations meet.

::: {.definition #def-architecture title="Software architecture"}
The architecture of a software system is its consequential organization: its major parts, the
responsibilities assigned to them, their interfaces, and the rules governing how they may interact.
:::

The word consequential matters. Thousands of structural facts are true of any software system.
Architecture concerns the organizational decisions whose consequences matter enough to constrain
later engineering work.

## From specification to one system {#sec-spec-to-system}

The previous chapter (@ch-specification) described specification as a boundary around acceptable
realizations. Several different systems might satisfy every stated obligation: Requirements →
Specification → Acceptable realizations A, B, C.

Architecture does not extend the specification until only one realization remains. Instead,
engineers choose one acceptable system and decide how its obligations will coexist in a coherent
organization.

A useful architecture answers four questions:

- What are the major parts, and what is each responsible for?
- Where should the boundaries go?
- How may the parts interact?
- What properties must the organization support?

The first three questions describe structure. The fourth explains why the structure matters. An
architectural organization can support or frustrate performance, security, reliability,
modifiability, consistency, failure isolation, expected change, and many other properties. We do
not draw boxes for their own sake. We draw boundaries because the boundaries change what becomes
easy, difficult, visible, or expensive.

## Architecture creates possibilities and constraints {#sec-possibilities-constraints}

Consider a building wall. The building architect may determine where the wall stands, how thick it
is, where service space exists, and which penetrations are permitted. Those decisions do not
specify the exact plumbing that will later occupy the wall. But they constrain the plumbing. The
plumbing designer inherits a space of possible designs shaped by the architectural decisions
already made. Some routes are easy. Others are awkward. Some are impossible.

Software architecture works similarly. A component boundary, interface, deployment choice, or
dependency rule does not determine every implementation decision inside the parts. It changes the
space within which those decisions can be made. Architecture therefore establishes strategy for the
engineering work that follows.

## Where should the boundaries go? {#sec-boundaries}

Boundaries determine what must be reasoned about together and what may vary independently. A useful
way to evaluate a proposed boundary is to ask whether the things on either side should: change
together, fail together, scale together, remain consistent together, be secured together, or be
owned together. These forces rarely point in the same direction.

Suppose one organization separates a sleep-analysis system into collection, classification,
summary, and advice. Another groups collection with storage, modeling with advice, and isolates
sharing. Both may satisfy the specification. But they allocate coupling differently. A change to
the advice representation may remain local in one organization and cross several boundaries in the
other. Failure of storage may affect different capabilities. One decomposition may make independent
scaling easy while another simplifies consistency. Architecture does not eliminate coupling.
Architecture allocates coupling.

That yields a useful summary question:

::: {.decision #decision-where-boundary title="Where should the boundary go?"}
Draw a boundary so that the interactions and changes you expect are easy, while interactions and
changes you do not want are difficult.
:::

This is not a mechanical rule. Expected change may suggest one boundary while consistency suggests
another. Security may argue for separation while performance argues for co-location. The
architectural problem is to make those competing forces coexist acceptably.

## Architecture also allocates coordination among people {#sec-coordination}

Software boundaries can become organizational boundaries. Once a system has coarse-grained parts
with stable responsibilities and interfaces, those parts can often become units of ownership. One
team can change a component internally without continually coordinating every implementation
decision with another team.

Change the architecture and the possible division of labor changes with it. A feature that crosses
four architectural boundaries may require coordination among four teams. A responsibility contained
behind one boundary may be owned largely by one. This connection is reflected in Conway's
observation [@conway1968] that systems often come to resemble the communication structures of the
organizations that build them.

The useful engineering lesson is not that every component should have its own team or that an
organizational chart should be copied into software. It is that architecture shapes both technical
coupling and human coordination. A boundary can reduce one while increasing the other. This is
another reason architectural choices are consequential.

## Choosing among acceptable architectures {#sec-choosing}

Suppose two architectural organizations both satisfy the specification. Architecture A offers
lower latency and higher availability, but costs more and creates stronger coupling around future
changes. Architecture B is cheaper and makes changes more local, but has higher latency and lower
availability. Which is better? There is no answer until we know what matters. This is where
architectural decision-making begins.

## Constraints are not objectives {#sec-constraints-not-objectives}

The first step is to separate requirements that must be satisfied from properties we would merely
prefer to improve. Suppose the specification requires a maximum latency of 150 milliseconds. An
architecture predicting 180 milliseconds is not a somewhat worse candidate. It is outside the
acceptable realization space. A required bound is a constraint, not an objective to be traded
against cost.

::: {.note title="Constraints are not objectives"}
A candidate that violates the specification is not a lower-scoring architecture. It is not an
acceptable architecture.
:::

This distinction matters because apparently sophisticated decision methods can accidentally trade
away obligations. A weighted spreadsheet might assign scores for performance, cost, reliability,
and changeability, multiply by chosen weights, and declare one architecture the winner. The
arithmetic can create false authority. Where did the weights come from? What does a reliability
score of "5" mean? Is the distance between 3 and 4 the same as between 4 and 5? Why is poor
reliability allowed to be compensated by lower cost at the chosen exchange rate?

A spreadsheet does not turn preferences into measurement. Quantification is valuable when the
quantities are meaningful. Numbers invented to encode judgment do not stop being judgments because
they have decimal places.

## Eliminate what does not require judgment {#sec-eliminate}

Before comparing genuine tradeoffs, engineers can often eliminate candidates in two principled
ways.

The first is specification. Any architecture violating a required property leaves the acceptable
realization space and can be discarded.

The second is dominance. Suppose Architecture D is no better than Architecture A on every relevant
property and strictly worse on at least one. Then D is dominated by A. There is no need to decide
how much cost matters relative to latency or how reliability should be weighted. Any preference
that could justify D would justify A at least as strongly. So D can also be discarded. These steps
are powerful because neither requires deciding what we prefer.

::: {.decision #decision-eliminate-before-choosing title="Eliminate before choosing"}
First remove architectures that violate the specification. Then remove architectures dominated by
another candidate. Only then reason about the genuine tradeoffs that remain.
:::

## Genuine tradeoffs require judgment {#sec-genuine-tradeoffs}

After invalid and dominated candidates are removed, several architectures may remain. One may offer
better latency while another offers lower cost. One may improve failure isolation while another
simplifies consistency. One may preserve future changeability while another reduces present
complexity. If each candidate is better somewhere and worse somewhere else, no amount of
mathematics can decide among them without introducing a preference. These are Pareto tradeoffs.

Judgment is therefore not what remains when rigorous engineering fails. Judgment is the appropriate
mechanism when several nondominated alternatives satisfy the obligations and differ along
properties that cannot all be maximized simultaneously. That judgment should still be defensible.
Engineers can ask whose needs matter, which failures have serious consequences, which changes are
expected, what the organization can operate reliably, and which costs are acceptable. But the final
choice still expresses priorities. Architecture is decision-making under tradeoffs.

## Sometimes the right decision is to buy information {#sec-buy-information}

Uncertainty does not always require an immediate decision. Suppose two architectures remain
plausible because engineers do not know the expected traffic, failure rate, change frequency, or
cost of a particular dependency. Ask: if we knew the answer, could it change the architectural
choice? If no, the information is irrelevant to this decision. Decide without buying it. If yes,
ask whether the information is worth more than it costs to obtain. Engineers can buy information
through models, prototypes, experiments, measurements, or competing partial implementations
[@fairbanks2010].

::: {.decision #decision-buy-evidence title="Buy evidence?"}
If resolving an uncertainty could change a consequential architectural decision, evidence may be
worth purchasing. Do not spend effort obtaining information that cannot change the decision. Do not
refuse to obtain inexpensive information that could prevent an expensive mistake.
:::

This is the same economic logic that appeared in @ch-requirements and @ch-specification. Models and
prototypes are not inherently virtuous artifacts. They are ways to reduce uncertainty about
decisions.

## Patterns provide alternatives and expectations {#sec-patterns}

Architectural problems recur. Components repeatedly need to share state. Dependencies repeatedly
need to cross abstraction boundaries. Services repeatedly need to communicate. Domain logic
repeatedly needs to depend on infrastructure. Software engineering has accumulated recurring
organizational responses to these problems: architectural patterns.

A pattern is valuable not because its name tells us what to do, but because experience with the
pattern provides expectations about consequences. A pattern therefore gives us two things: a
plausible candidate organization, and a prior expectation about what it tends to make easier or
harder. The expectation is not a guarantee.

::: {.note title="A pattern name is a hypothesis about consequences"}
"Layered," "event-driven," or "ports and adapters" does not settle an architectural decision.
Identify the forces, compare alternatives, and decide.
:::

The following examples illustrate the method.

### Strict layering or deliberate crossing? {#sec-layering}

Suppose dependencies are organized into layers: Application → File API → Operating system →
Storage. Strict layering provides simple dependency rules. A layer interacts through the
abstraction directly beneath it. This can improve local reasoning, replaceability, and isolation.

But strict layering can also obstruct mechanisms that naturally need to cross the abstraction.
Memory-mapped files provide a useful example. An application can map file contents into virtual
memory so that paging machinery loads data on demand. The mechanism deliberately connects
abstractions that a strict interpretation of layering would keep apart. The crossing buys
capability that the clean abstraction does not naturally provide. It also creates stronger coupling
between layers.

::: {.tradeoff #tradeoff-layering title="Layering"}
Strict layering tends to buy isolation, replaceability, and local reasoning. Deliberate crossing
can provide capabilities the clean abstraction cannot offer. The price is stronger cross-layer
coupling.
:::

The lesson is not that breaking layers is bad. It is that a layer crossing should be a deliberate
architectural decision whose benefit justifies its cost.

### Pipeline or repository? {#sec-pipeline-repository}

Suppose several computations operate on related information. One organization is a pipeline: Input
→ Analyzer → Optimizer → Report. Intermediate state moves through a sequence of transformations.
Each stage can remain comparatively independent and needs primarily to understand the
representation it receives and produces. Another organization uses a repository. The same
components operate on one authoritative shared representation. The parts may be identical. The
organization of state is different.

::: {.tradeoff #tradeoff-pipeline-repository title="Pipeline or repository"}
A pipeline makes flow explicit and keeps dependencies local to neighboring stages. It works well
when computation forms a natural sequence. A repository gives several components independent access
to authoritative shared state. It simplifies integration around that state but introduces coupling
through the central representation and shared fate around the repository.
:::

A pattern name does not answer which is better. The relevant question is whether local independence
or shared consistency matters more in this system.

### Synchronous calls or event-driven communication? {#sec-rpc-events}

Suppose one component requires another to perform work. With synchronous RPC, the caller knows its
callee, sends a request, and waits for the result. Technologies such as REST and gRPC commonly
implement this interaction style. This provides clear request-response semantics and immediate
coordination. But latency and failure can propagate through the call chain. The caller is also
directly coupled to the identity and availability of the callee.

An event-driven organization moves the dependency. A producer publishes an event without knowing
which consumers react. New consumers may be added without changing the producer. The producer and
consumers are now more independent, but ordering, delivery, retries, event schemas, and
observability become system concerns. Again, architecture allocates coupling; it does not eliminate
it.

::: {.tradeoff #tradeoff-rpc-events title="RPC or events"}
Synchronous RPC buys immediate coordination and clear request-response behavior. Event-driven
communication buys producer-consumer decoupling and easier addition of consumers. Events do not
eliminate coupling. They move it into schemas, delivery semantics, ordering assumptions, and
recovery mechanisms.
:::

### Direct infrastructure dependency or ports and adapters? {#sec-ports-adapters}

Suppose domain logic needs persistent storage. The direct organization is simple: domain code
imports and calls the database SDK. This minimizes abstractions and indirection. But it also means
the domain depends directly on infrastructure. Changes in the database API or vendor can propagate
into the domain.

Ports and adapters reverse the source dependency. The domain defines an interface expressing what
it needs in its own vocabulary. An adapter implements that interface using the database or external
service. Infrastructure now depends on an interface defined by the domain. This can isolate domain
logic from infrastructure changes. It also creates additional interfaces, adapters, and indirection
that must be maintained.

::: {.tradeoff #tradeoff-ports-adapters title="Direct dependency or ports and adapters"}
Direct dependency buys simplicity and fewer abstractions. Ports and adapters buys isolation from
infrastructure change. The boundary is worth purchasing only when the infrastructure change it
isolates is consequential enough to justify its continuing cost.
:::

Patterns therefore provide expectations, not measurements. They tell us what tends to happen. They
do not tell us what will happen in this system.

## Architecture makes properties analyzable {#sec-analyzable}

If an architectural choice matters enough, engineers may want stronger evidence than pattern
experience alone. The first question is: what claim are we trying to support? Different claims
require different architectural models. A dependency model can show whether an expected change
crosses a boundary. A flow model can expose a latency-sensitive path. A deployment model can show
which failures can affect several components together [@kruchten1995].

There is no single "architecture diagram" that answers every architectural question. A diagram
earns its place by supporting an argument. This repeats a principle from Specification: different
engineering questions require different representations.

## Architectural claims have different strengths {#sec-claim-strengths}

Not all architectural evidence supports equally strong claims [@bass-saip]. At one level is a
reasoned expectation: this pattern should keep the change local. The claim is informed by
experience but still contains substantial uncertainty. A stronger claim may come from a structural
argument: no dependency crosses this boundary. If the dependency model faithfully represents the
implementation, the structural fact can be inspected directly. A quantitative model can support a
numerical prediction: the modeled critical path is approximately 120 milliseconds. Finally, a
running system can provide observed evidence: the measured latency is 118 milliseconds under this
workload. The required strength depends on the consequences of being wrong.

::: {.key-idea #key-match-evidence title="Match the evidence to the claim"}
The more faithfully the model captures the property we care about, the less we have to bet. A
reasoned expectation, structural argument, quantitative prediction, and measurement are all useful.
The mistake is presenting one as stronger than it is.
:::

## Can an expected change remain local? {#sec-change-local}

Suppose the specification tells us that the illness-detection model is expected to change
independently. An initial architecture may allow the user interface, advice generation, and storage
logic to depend directly on the model's internal representations. Replacing the model then affects
several parts of the system. Engineers can instead introduce a model-service boundary and require
surrounding components to depend only on the stable interface.

A dependency model can now answer a concrete question: does any dependency cross the intended
boundary into the model's internals? If not, the model establishes a structural fact about the
dependency graph. That does not prove that every imaginable future change will remain local. It
gives strong evidence that the anticipated change has been isolated by the architecture.

This is why the treatment of expected change in @ch-specification mattered. Specification can
identify where change is expected. Architecture can deliberately create a seam around it.

## Can architecture predict performance? {#sec-predict-performance}

Architectural models can sometimes support quantitative claims before implementation. Suppose a
request flows through several components whose expected processing and communication costs are
known well enough to estimate. A weighted flow graph can identify the critical path: the sequence
of dependent work establishing a lower bound on response time.

If the modeled critical path is A → B → F = 120 ms, then decomposing component B into parallel work
may reduce the modeled bound. The important point is not the particular number. The architectural
model allows engineers to evaluate a proposed organizational change before implementing it. The
model has converted part of the architectural decision from intuition into a testable prediction.

## When evidence becomes cheaper {#sec-evidence-cheaper}

Models, prototypes, workload generators, measurements, and competing implementations all cost
engineering effort. Historically, that cost has rationed architectural evidence. Many questions
were resolved primarily through experience and judgment because stronger evidence was too expensive
to obtain.

As implementation and analysis become cheaper, the calculation changes. Software agents can help
construct throwaway prototypes, generate workloads, instrument competing designs, analyze
dependency graphs, or explore alternatives. This does not eliminate architectural tradeoffs. It can
reduce the cost of learning about their consequences. When evidence becomes cheaper, more questions
become worth investigating.

The engineering objective is therefore not to ask an agent to choose an architecture. Preference,
obligation, and responsibility still belong to the engineers accountable for the system. The useful
role of automation is to reduce how much of the architectural choice remains a bet.

## A practical architecture decision procedure {#sec-decision-procedure}

The ideas in this chapter can be summarized as a sequence.

::: {.decision #decision-defend-choice title="Defend an architectural choice"}
1. Generate plausible alternatives. Use decomposition, prior experience, and architectural patterns
   to identify serious candidates.
2. Eliminate specification violations. A candidate outside the acceptable realization space is not
   a tradeoff.
3. Eliminate dominated alternatives. If another candidate is at least as good everywhere and better
   somewhere, discard the dominated candidate.
4. Name the remaining tradeoff. State explicitly what one architecture gains and what it gives up.
5. Ask what is unknown. Identify uncertainties that could change the choice.
6. Buy evidence when worthwhile. Model, prototype, experiment, or measure when the information
   could change a consequential decision and is worth its cost.
7. Decide and accept responsibility. Choose among the remaining tradeoffs according to the
   obligations, priorities, and consequences that matter.
:::

There need not be one correct architecture. Two engineering teams may make different judgments and
both be defensible if each satisfies the specification, understands the tradeoffs, and supports
its consequential claims with appropriate evidence.

## Architecture is recursive {#sec-recursive}

Architecture does not occupy one fixed level of a system hierarchy. A system may be decomposed into
major components. One of those components may itself be too large to reason about directly.
Engineers then establish an architecture for that component: its major internal parts, their
responsibilities, interfaces, and rules of interaction. Architecture therefore recurs wherever
engineers need to impose consequential organization on parts that are still too large to treat as
directly understandable units.

What makes a decision architectural is not its position in a diagram. It is that the decision
establishes consequential organization within which further engineering decisions will be made.

## From architecture to design {#sec-to-design}

Architecture deliberately does not decide everything. Once engineers have selected an
organization, each part has an assigned responsibility and operates within boundaries, interfaces,
and interaction rules. Those parts are not yet implementations. A component responsible for
classification may still need internal choices about data structures, algorithms, state ownership,
concurrency, failure handling, caching, dependencies, and other mechanisms.

This is the transition from strategy to tactics. Architecture establishes the strategy: the
consequential organization that shapes what later work may do. @ch-design determines how each part
realizes its responsibility within that strategy.

Detailed design may also expose that an architectural choice cannot work as expected. A supposedly
local choice may affect latency, consistency, security, failure isolation, or another system-wide
property. In that case, design has exposed an architectural problem and the strategy must be
reconsidered.

Architecture constrains the available tactics. Design tests whether the strategy is workable.

Specification asks: which realizations would we accept? Architecture asks: how should one
acceptable realization be organized? Design asks: how should each part actually work?

## Summary

Architecture chooses the consequential organization of one acceptable realization: its major parts,
their responsibilities, the boundaries between them, and the rules by which they interact.
Boundaries do not eliminate coupling. They allocate it, affecting both technical dependencies and
the coordination required among people.

Architectural decisions should begin by eliminating candidates that violate the specification and
alternatives that are dominated by others. What remains are genuine tradeoffs requiring engineering
judgment. Patterns provide plausible alternatives and expectations about their consequences, not
answers. When uncertainty could change a consequential choice, engineers can buy information
through models, prototypes, experiments, or measurement. The stronger the evidence, the less of the
architectural decision remains a bet. Architecture establishes the strategy within which design
must work.

::: read_further
Bass, Len, Paul Clements, and Rick Kazman. *Software Architecture in Practice*. 3rd ed. Boston:
Addison-Wesley, 2012. The standard treatment of how quality attributes drive structural decisions,
with methods for analyzing an architecture against the properties it must support.

Fairbanks, George. [*Just Enough Software Architecture: A Risk-Driven Approach*](https://www.georgefairbanks.com/book/). Boulder, CO: Marshall & Brainerd, 2010. Argues for spending architectural modeling effort only where risk could change a decision — the buy-evidence economics this chapter builds on.

Kruchten, Philippe. ["The 4+1 View Model of Architecture."](https://doi.org/10.1109/52.469759) *IEEE Software* 12, no. 6 (1995): 42–50. The classic statement that no single diagram answers every architectural question: different stakeholders' questions call for different concurrent views of the same system.
:::
