---
id: architecture
title: Architecture
short_title: Architecture
order: 6
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

Suppose a service contains two helper functions. Renaming one or moving it into another source
file changes the organization of the program, but usually not its architecture. Splitting the
service into two independently deployed processes is different: the new boundary changes
communication, failure, deployment, ownership, and perhaps consistency. Later engineering must now
work within those consequences.
:::

The word consequential matters. Thousands of structural facts are true of any software system.
Architecture concerns the organizational decisions whose consequences matter enough that later
engineering should treat them as constraints or affordances.

## From specification to one system {#sec-spec-to-system}

The previous chapter (@ch-specification) described specification as a boundary around acceptable
realizations. Several different systems might satisfy every stated obligation: Requirements →
Specification → Acceptable realizations A, B, C.

Architecture does not extend the specification until only one realization remains. Instead,
engineers choose among acceptable realizations and establish the consequential organization of the
system they intend to build.

A useful architecture answers four questions:

- What are the major parts, and what is each responsible for?
- Where should the boundaries go?
- How may the parts interact?
- What properties must the organization support?

The first three questions describe structure. The fourth explains why the structure matters. An
architectural organization can support or frustrate performance, security, reliability,
modifiability, consistency, failure isolation, expected change, and many other properties.
Architecture is therefore not box drawing. The boxes and arrows matter only when the distinctions
they represent change what becomes easy, difficult, visible, or expensive.

## Architecture creates possibilities and constraints {#sec-possibilities-constraints}

Think about a building. The architect need not specify the exact plumbing fittings inside a wall.
But the architecture may already determine where the wall goes, how thick it is, where service
space is available, and which penetrations are permitted. Those choices do not determine the
plumbing design. They create the space within which the plumbing designer must work.

Software architecture does the same thing. A boundary, interface, deployment decision, or
interaction rule leaves many implementations possible while making some implementations easier,
harder, or impossible. An interface may make one component replaceable. A process boundary may
permit independent failure or scaling. A rule forbidding direct access to another component's
storage may preserve ownership at the cost of additional communication. Architecture creates the
possibilities and constraints within which later design must work.

## Where should the boundaries go? {#sec-boundaries}

One of the most consequential architectural decisions is where to draw boundaries. A boundary is a
promise about reasoning: things on the same side may be understood, changed, and operated together;
things on opposite sides should be understandable apart.

Suppose the same acceptable system can be organized in two ways. One organization separates
collection, classification, summarization, and advice into distinct parts. Another groups
collection with storage, groups modeling with advice, and isolates sharing. Neither organization
eliminates dependencies among these responsibilities. Each chooses where those dependencies will
live. A change to the advice representation may remain local in one organization and cross several
boundaries in the other. Failure of storage may affect different capabilities. One decomposition
may make independent scaling easy while another simplifies consistency. Architecture does not
eliminate coupling. Architecture allocates coupling.

When considering a boundary, ask which responsibilities should change together, fail together,
scale together, remain consistent together, be secured together, or be owned together. Evidence
that two responsibilities should vary independently argues for separating them. Evidence that they
must coordinate tightly argues for keeping them together or accepting the cost of coordination
across the boundary.

These forces rarely point in the same direction. For example, suppose two responsibilities change
for different reasons and should fail independently. Both facts argue for a boundary. If nearly
every operation must nevertheless maintain a strongly consistent invariant across them, that fact
argues against the boundary. The decision is not whether coupling exists, but where the coupling
is easiest to understand and manage.

A useful question is therefore:

::: {.decision #decision-where-boundary title="Where should the boundary go?"}
Draw a boundary so that the interactions and changes you expect are easy, while interactions and
changes you do not want are difficult.
:::

### What should a boundary make local? {#sec-boundary-local}

Decomposition is valuable when it makes consequential reasoning local.
Different decompositions can produce the same externally correct behavior while distributing understanding, change, reuse, and failure differently.
When comparing them, ask:

- **Understanding:** Can a part be understood without reconstructing the whole system?
- **Change:** Can an expected change remain local rather than spreading through unrelated parts?
- **Composition:** Can a part be reused or recombined without importing unnecessary context?
- **Failure:** Can a local failure remain local rather than corrupting unrelated work?

These objectives can conflict.
Additional decomposition may improve change or failure containment while introducing more interfaces, dependencies, and concepts.
A useful boundary therefore does not maximize modularity; it makes the properties that matter for this system sufficiently local.

## Architecture also allocates coordination among people {#sec-coordination}

Architectural boundaries do not affect only software. They also affect how engineering work can be
divided. Once a system has coarse-grained parts with reasonably clear responsibilities and
interfaces, those parts can become units of ownership. A team may be able to change one part
largely independently; a change that routinely crosses three boundaries may instead require
coordination among three teams.

This relationship between software structure and organizational structure is captured by Conway's
Law [@conway1968]: organizations tend to produce systems whose structures reflect their
communication structures. The relationship matters in both directions. Existing organizational
boundaries can push a system toward particular architectural boundaries, while an architectural
choice can make some divisions of engineering work easier than others.

This connects architecture to the coordination problem introduced in @ch-teamwork. A boundary that
localizes software change may also localize the communication needed to make that change. A
boundary that forces routine work across several parts may create a recurring coordination cost
even when the resulting software is technically sound. Architecture allocates coupling in software
and coordination among people.

## Choosing among acceptable architectures {#sec-choosing}

Several organizations may satisfy the same specification. Architecture therefore presents a
decision problem: which acceptable organization should we choose, given what we know and what
matters? Suppose two architectural organizations both satisfy the specification. Architecture A
offers lower latency and higher availability, but costs more and creates stronger coupling around future
changes. Architecture B is cheaper and makes changes more local, but has higher latency and lower
availability. Which is better? There is no answer until we know what matters. This is where
architectural decision-making begins.

## Constraints are not objectives {#sec-constraints-not-objectives}

The first step is to separate requirements that must be satisfied from properties we would merely
prefer to improve. Suppose the specification requires a maximum latency of 150 milliseconds. An
architecture predicting 180 milliseconds is not merely worse on latency. It is outside the
acceptable realization space. It is not a worse choice; it is not a choice. A required bound is a
constraint, not an objective to be traded against cost.

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

Judgment begins where mechanical elimination ends. It is not what remains when rigorous
engineering fails; it is the appropriate mechanism when several nondominated alternatives satisfy
the obligations and differ along properties that cannot all be maximized simultaneously. Nor is it
arbitrary: the choice can still be argued, reviewed, supported with evidence, and owned by the
engineers responsible for its consequences. Engineers can ask whose needs matter, which failures
have serious consequences, which changes are expected, what the organization can operate reliably,
and which costs are acceptable. But the final
choice still expresses priorities. Architecture is decision-making under tradeoffs.

## Sometimes the right decision is to buy information {#sec-buy-information}

Uncertainty does not always require an immediate decision. Suppose two architectures remain
plausible because engineers do not know the expected traffic, failure rate, change frequency, or
cost of a particular dependency. Engineers do not have to guess. They can buy information through
models, prototypes, experiments, measurements, or competing partial implementations
[@fairbanks2010].

::: {.decision #decision-buy-evidence title="Buy evidence?"}
If resolving an uncertainty could change a consequential architectural decision, evidence may be
worth purchasing. Do not spend effort obtaining information that cannot change the decision. Do not
refuse to obtain inexpensive information that could prevent an expensive mistake.
:::

This is the same economic logic that appeared in @ch-requirements and @ch-specification. Before
accepting uncertainty, ask whether resolving it could change the decision. If not, further
analysis has little decision value. If it could, ask whether the information is worth more than it
costs to obtain. Models, prototypes, experiments, and measurements are different ways of buying
that information.

## Patterns provide alternatives and expectations {#sec-patterns}

Engineers rarely begin an architectural decision without prior experience. Recurring architectural
problems have accumulated recurring solutions: layers, pipelines, repositories, event messaging,
ports and adapters, and many others. These patterns are useful because they expand the set of
plausible alternatives and carry experience about their likely consequences.

A pattern does not determine the answer. Strict layering can isolate change but make useful
cross-layer interactions awkward. A shared repository can simplify consistency while coupling
otherwise independent work through shared state. Event messaging can decouple producers and
consumers while making ordering, observability, and failure handling harder. Ports and adapters
can isolate infrastructure change while adding interfaces and indirection.

Patterns tell us what tends to happen, not what will happen in our context. They provide priors:
plausible organizations and expectations about their consequences. If a consequential choice
depends on whether those expectations hold here, stronger evidence may be worth buying.

## Different questions require different architectural views {#sec-architectural-views}

An architecture is not one box-and-arrow diagram. Different engineering questions require
different reductions of the same system. The useful representation depends on the property
engineers need to reason about.

Suppose we ask whether an expected change can remain inside one component. A dependency model can
expose which other components know about it. Ask whether a request can satisfy a latency bound,
and a flow model annotated with processing and communication costs may be more useful. Ask which
failures can occur together, and a deployment model showing where components execute may expose
the relevant relationships. The system has not changed. The engineering question has.

This is the same modeling discipline introduced in @ch-specification. A model is a purposeful
reduction: preserve the distinctions needed to answer the question and omit details that do not
contribute to it. Philippe Kruchten's classic multiple-view account of architecture makes the same
underlying point: no single representation serves every architectural concern [@kruchten1995].

There is therefore no single artifact that is "the architecture diagram." A diagram earns its
place by supporting an engineering question. A drawing that cannot support a claim is decoration.
Architecture makes some properties analyzable because its consequential structure can be
represented at the level needed to reason about those properties.

## Architectural claims have different strengths {#sec-claim-strengths}

A model makes a question tractable; it does not automatically make the answer certain.
Architectural claims vary in strength according to what the model represents, what assumptions the
analysis depends on, and what evidence supports those assumptions [@bass-saip]. At one level is a
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

**Question:** If this expected change occurs, how much of the system must know?

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

**Question:** Can this organization satisfy the required response-time bound?

Architectural models can sometimes support quantitative claims before implementation. Suppose a
request flows through several components whose expected processing and communication costs are
known well enough to estimate. A weighted flow graph can identify the critical path: the sequence
of dependent work establishing a lower bound on response time.

If the modeled critical path is A → B → F = 120 ms, then decomposing component B into parallel work
may reduce the modeled bound. The important point is not the particular number. The architectural
model allows engineers to evaluate a proposed organizational change before implementing it. The
model has converted part of the architectural decision from intuition into a testable prediction.
It has not chosen the architecture; it has supplied evidence about one of its consequences.

## When evidence becomes cheaper {#sec-evidence-cheaper}

Models, prototypes, workload generators, measurements, and competing implementations all cost
engineering effort. Historically, that cost has rationed architectural evidence. Many questions
were resolved primarily through experience and judgment because stronger evidence was too expensive
to obtain. The decision to gather evidence is therefore itself an engineering decision.

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
   to identify serious candidates. For consequential boundary choices, ask what should change,
   fail, scale, remain consistent, be secured, or be owned together.
2. Eliminate specification violations. A candidate outside the acceptable realization space is not
   a tradeoff.
3. Eliminate dominated alternatives. If another candidate is at least as good everywhere and better
   somewhere, discard the dominated candidate.
4. Name the remaining tradeoff. State explicitly what one architecture gains and what it gives up.
5. Ask what is unknown. Identify uncertainties that could change the choice, and state the
   engineering question whose answer would reduce that uncertainty.
6. Buy evidence when worthwhile. Choose a model, prototype, experiment, or measurement that can
   answer the question when the information could change a consequential decision and is worth
   its cost.
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

What makes a decision architectural is not its position in a system hierarchy. It is that the
decision establishes consequential organization that later engineering will take as given.

## From architecture to design {#sec-to-design}

Architecture deliberately does not decide everything. Once engineers have selected an
organization, each part has an assigned responsibility and operates within boundaries, interfaces,
and interaction rules. Those decisions create constraints and affordances for later work, but the
parts are not yet implementations. A component responsible for classification may still need
internal choices about data structures, algorithms, state ownership,
concurrency, failure handling, caching, dependencies, and other mechanisms.

This is the transition from strategy to tactics. Architecture establishes the strategy by
constraining the available tactics. @ch-design determines how each part realizes its
responsibility within those constraints and affordances.

Detailed design may also expose that the strategy cannot work as expected. A supposedly local
choice may prove consequential to latency, consistency, security, failure isolation, or another
system property. In that case, the right response may be to revisit the architecture rather than
force a local workaround.

Specification asks: which realizations would we accept? Architecture asks: how should one
acceptable realization be organized? Design asks: how should each part actually work?

Architecture constrains the available tactics. Design tests whether the strategy is workable.

## Summary

Architecture chooses the consequential organization of one acceptable realization: its major
parts, their responsibilities, the boundaries between them, and the rules by which they interact.
Architectural decisions create constraints and affordances that later engineering must inherit.
Boundaries do not eliminate coupling; they allocate it. Ask what should change, fail, scale,
remain consistent, be secured, or be owned together. The resulting boundaries affect both
technical dependencies and the coordination required among people.

Architectural decisions should begin by eliminating candidates that violate the specification and
alternatives that are dominated by others. What remains are genuine tradeoffs requiring
engineering judgment. Patterns provide plausible alternatives and expectations about their
consequences, not answers. Different engineering questions may require different architectural
views; there is no single diagram that answers every question about a system. When uncertainty
could change a consequential choice, engineers can buy information through models, prototypes,
experiments, or measurement. The stronger the evidence, the less of the architectural decision
remains a bet.

Architecture establishes a strategy without determining every tactic. Architecture constrains the
available tactics. Design tests whether the strategy is workable.

::: read_further
Bass, Len, Paul Clements, and Rick Kazman. *Software Architecture in Practice*. 3rd ed. Boston:
Addison-Wesley, 2012. The standard treatment of how quality attributes drive architectural
decisions.

Fairbanks, George. [*Just Enough Software Architecture: A Risk-Driven Approach*](https://www.georgefairbanks.com/book/). Boulder, CO: Marshall & Brainerd, 2010. A risk-driven approach to deciding how much architectural modeling is worth doing.

Kruchten, Philippe. ["The 4+1 View Model of Architecture."](https://doi.org/10.1109/52.469759) *IEEE Software* 12, no. 6 (1995): 42–50. The classic argument for using multiple architectural views to answer different engineering questions.
:::
