---
id: requirements
title: Requirements Engineering
short_title: Requirements
order: 3
status: draft
description: >
  Requirements engineering turns uncertainty about what matters into engineering commitments. It
  couples discovering what would create value with deciding what can responsibly be promised.
objectives:
  - Distinguish discovering candidate requirements from deciding which to accept.
  - Identify requirement sources beyond users and customers, and choose discovery techniques by the uncertainty they resolve.
  - Explain why feasibility, cost, and opportunity cost belong inside requirements engineering.
  - Distinguish estimates, budgets, targets, and commitments.
---

**Premise.** *Requirements engineering turns uncertainty about what matters into engineering
commitments.*

Software systems are built for purposes in the world. Before engineers can decide how a system
should work, they must decide what it should accomplish.

That is not simply a matter of asking people what they want. A user usually describes a solution
they can imagine, using the vocabulary of systems they already know. Their request may reveal
something important without literally describing what should be built. Different stakeholders may
want different things. Important needs may remain implicit until something violates them.
Obligations may also come from laws, contracts, existing systems, operations, standards, or other
parts of the surrounding domain.

The requirements engineer is therefore not a stenographer. Requirements engineering requires
interpretation, and engineers are responsible for the interpretations and commitments they make.

::: {.definition #def-requirements-engineering title="Requirements engineering"}
Requirements engineering connects the purposes a system serves to decisions about what the system
should do and what constraints it must satisfy. It discovers candidate obligations, evaluates them,
and determines which the engineering effort will accept.
:::

Requirements engineering therefore has two coupled problems: discovering what would create value and
deciding what we can responsibly promise.

## Requirements connect purpose to the system {#sec-purpose-to-system}

A requirement is meaningful relative to some purpose. Requirements connect what a system is for to
what engineers promise the system will do.

The relationship appears simple: Purpose → Requirements → System.

In practice, purpose does not arrive as a complete, coherent description. Different stakeholders see
different parts of the problem. A manager may understand organizational goals and constraints while
an operator understands daily work, exceptions, and workarounds. A customer may understand the
outcome they want without knowing which system behavior would produce it. Stakeholders may disagree
about priorities or even about the problem being solved.

Requirements engineering exists partly because purpose must be discovered, interpreted, reconciled,
and converted into obligations that engineering can act upon.

Requirements are commonly described in several overlapping categories. The categories are useful as
a checklist for coverage, not as a classification test.

Functional requirements describe behavior the system should provide. For example: email an
administrator when a project has no moderator.

Quality requirements describe how well the system should behave or limits its behavior should
satisfy. Some are already close to measurable: 95% of searches return within one second. Others
express a meaningful obligation while leaving substantial interpretation unresolved: the system
follows security best practices.

Domain and external requirements arise from the environment in which the system exists. For example,
a regulation may require that withdrawing consent be as easy as giving it.

The examples differ greatly in precision. Being a requirement does not imply being sufficiently
precise to implement or validate. "95% of searches return within one second" already supplies a
measurable threshold. "The system follows security best practices" leaves important questions
unanswered: which practices, against which threats, and what evidence would establish that the
obligation has been satisfied?

Resolving those questions is part of the path from requirements to specification.

## Requirements come from more than users {#sec-requirement-sources}

Users and customers are important sources of requirements, but they are not the only ones.

Candidate requirements can come from users, customers, operations, existing systems, technology,
laws and standards, contracts, competitors, and the surrounding domain. Each source sees different
obligations.

An operations engineer may need logging, rate limiting, observability, or a way to disable a
malfunctioning feature even though no end user would ask for them. An existing system may impose a
data format that other systems have come to depend upon. A contract may contain an obligation that
nobody currently working on the software negotiated. Laws and standards can impose obligations on an
organization that ultimately require particular software behavior.

These sources can also differ in authority and precision.

A regulation, for example, may impose a binding requirement to provide security appropriate to some
risk without prescribing exactly what technical measures satisfy it. The requirement is
authoritative, but engineering work remains.

Authority and precision are different properties. A requirement can be binding while leaving
important engineering decisions open.

Requirements also rarely stand alone. Understanding one may require knowing who needs it, what goal
it serves, why it exists, which scenarios exercise it, how important it is, which interfaces it
affects, and how anyone could determine whether it has been satisfied. Recording only a requirement
sentence can discard information needed to interpret the obligation later.

## Discovering what matters {#sec-discovering}

Engineers choose discovery techniques according to what they do not yet know.

Ask when stakeholders can articulate the needed information. Interviews, surveys, workshops, and
similar techniques expose goals, preferences, constraints, and disagreements that people can
describe.

Observe when important knowledge is embedded in work practice. Observation of users, operational
data, existing systems, incidents, and workarounds can expose needs that nobody thought to state.

Compare when competitors, substitutes, or previous systems reveal alternatives that have already
been explored. Existing solutions can expose both expectations and opportunities.

Build when people cannot evaluate an idea well in the abstract but can react to something concrete.
A prototype, mock-up, experiment, or partial implementation can turn an imagined possibility into
something stakeholders can inspect and criticize.

Each technique is a way of buying information about the problem. The appropriate technique depends
on the uncertainty being resolved and the cost of resolving it.

This makes requirements engineering iterative. Engineers discover candidate obligations, organize
them, negotiate conflicts, record decisions, and learn from what happens next: Discover → Organize →
Negotiate → Record → Learn → repeat.

Every software process performs some version of this loop. What differs is when requirements are
established, how much is established at once, and how often earlier decisions are revisited.

## Building can be a discovery technique {#sec-building-to-discover}

Software's changeability makes building unusually useful as a way to learn.

When a prototype is expensive, engineers have strong incentives to describe an idea carefully before
realizing it. The first substantial reaction from stakeholders may arrive only after considerable
work.

When a prototype is cheap, the sequence can change: Idea → Build enough to react to → Reaction →
Revise → Reaction → Revise.

People are often better at criticizing an artifact than specifying one in advance. A partial
realization can therefore expose needs, preferences, assumptions, and disagreements that remained
invisible in discussion.

This does not make every prototype useful. A prototype should exercise the uncertainty engineers are
trying to resolve. Something that looks finished can also acquire commitments nobody intended:
stakeholders may interpret a provisional interface, behavior, or technical choice as a decision.

::: {.note title="Prototype ≠ specification"}
A prototype can teach us the requirements. It is not the specification, and it is not necessarily
the product.
:::

The engineering question is not whether to think or to build. It is which action buys the
information needed for the next consequential decision.

## From candidate requirement to commitment {#sec-candidate-to-commitment}

Discovering that something would be valuable does not automatically make it a requirement.

::: {.definition #def-candidate-requirement title="Candidate requirement and requirement"}
A candidate requirement is an obligation under consideration. A requirement is an obligation the
engineering effort has accepted.
:::

That distinction matters because accepting a requirement creates responsibility.

Suppose a team learns that customers would value four improvements: accessibility remediation, a new
collaboration feature, twice the current performance, and enterprise single sign-on with auditing.
The team has enough capacity to deliver only two.

Which two should it promise?

There is not enough information to answer. That is the point.

Engineers need to know who benefits, which obligations are mandatory, how much value each creates,
what dependencies each introduces, what each will cost over its lifetime, what risks each creates,
and what opportunities are lost by choosing it.

Engineering capacity is finite. Accepting one obligation consumes resources that could have served
another. The cost of a requirement therefore includes not only what it takes to satisfy it, but also
the value of what the organization gives up by doing so.

This is opportunity cost.

Requirements engineering therefore combines discovery with commitment. It asks not merely *would
this be useful?* but *is this an obligation we should accept?*

## A list of requirements is not the ability to commit {#sec-list-not-commitment}

Consider an organization preparing to replace or substantially change an enterprise system.
Stakeholders may already have produced a large spreadsheet of requested features. That list can
contain substantial useful information and still be insufficient to establish a credible scope,
cost, or implementation plan [@kostova2019].

Different groups often know different parts of the system. Management may understand organizational
strategy, regulation, budgets, and desired outcomes. Operational staff may understand actual
workflows, exceptions, recurring friction, and workarounds. Technical staff may understand
dependencies and constraints invisible to both groups.

Requirements work brings these perspectives together. Workshops, analysis, and negotiation can
expose components and dependencies, reconcile competing concerns, identify organizational changes,
sequence work, and produce a more credible estimate.

The result is not simply a longer requirements list. It is a better basis for commitment.

*A list of requirements is not the ability to commit.*

## Requirements are commitments under scarcity {#sec-commitments-under-scarcity}

Feasibility belongs inside requirements engineering because engineers should not accept obligations
they cannot reasonably satisfy.

Cost belongs inside requirements engineering because an obligation worth \$100,000 may not be worth
\$10 million.

Dependencies belong inside requirements engineering because apparently small obligations can require
substantial surrounding work.

Risk belongs inside requirements engineering because the consequences of being wrong differ.

Professional judgment belongs inside requirements engineering because a system can be desired,
technically feasible, and affordable while still creating consequences engineers should not accept.

A useful decision therefore asks several questions together:

::: {.decision #decision-should-we-promise title="Should we promise it?"}
What purpose does the candidate requirement serve? Can we satisfy it? What resources and
opportunities will it consume? What dependencies and lifecycle obligations will it create? What are
the consequences if we fail? What consequences could satisfying it create? Are we willing to become
responsible for this obligation?
:::

The last question matters because accepting a requirement changes the engineering problem. The
requirement becomes something future architecture, design, implementation, validation, operations,
and maintenance must preserve.

## Cheap implementation does not make requirements free {#sec-cheap-implementation}

Suppose a stakeholder requests a feature and asks why it should cost much when a software agent can
implement it in minutes.

The premise may be partly correct. Implementation can be cheap.

But implementation is only one part of the cost created by accepting an obligation. The feature may
still require requirements work, design, integration, validation, security analysis, deployment,
operations, maintenance, support, and future changes. It may interact with other obligations or
increase the cost of satisfying them.

These surrounding costs are not immutable. Better architecture can isolate change. Automation can
reduce validation cost. Reusable infrastructure can reduce operations cost. Better representations
can reduce the cost of understanding the system.

But cheaper implementation does not reduce the lifecycle cost of a requirement to zero.

Cheaper implementation changes the economics of what we promise; it does not abolish those
economics.

## Estimates and requirements co-evolve {#sec-estimates-coevolve}

Requirements decisions therefore need estimates, but estimates themselves depend on requirements.

A simple conceptual model is: Cost ≈ Size × Cost per unit × Cost drivers.

Size describes how much capability must be produced. Cost per unit reflects what an organization can
historically produce with a given amount of effort. Cost drivers capture properties that make
apparently similar amounts of functionality more or less expensive: assurance, integration,
performance, migration, unusual expertise, operational constraints, and other obligations.

Requirements affect all three.

This creates an unavoidable loop. Engineers need some understanding of scope to estimate cost, while
estimates help determine which scope is worth accepting. Requirements and estimates therefore become
more precise together.

The objective is not to eliminate uncertainty before committing. It is to reduce uncertainty enough
to make a defensible commitment.

::: {.note title="Estimate ≠ budget ≠ target ≠ commitment"}
An estimate predicts. A budget allocates resources. A target expresses a desired outcome. A
commitment is a promise. Confusing them can turn uncertainty in an estimate into an impossible
engineering obligation.
:::

## From requirements to specification {#sec-to-specification}

Requirements engineering begins with a large space of things that might matter. Discovery produces
candidate obligations. Feasibility, economics, negotiation, risk, and judgment narrow those
candidates to obligations the engineering effort is willing to accept.

The process is not irreversible. What engineers learn through specification, design, implementation,
validation, and use may expose missing obligations or show that an earlier commitment should change.

Requirements engineering therefore does not eliminate uncertainty before engineers make commitments.
It reduces uncertainty enough to make those commitments defensible.

But an accepted obligation may still leave many possible systems.

"The system follows security best practices" is an obligation, but it does not yet establish what
practices count, which threats matter, or what evidence is sufficient. "Alert the user when their
sleep pattern suggests illness" says something important about the desired product without
determining when an alert occurs or what observations justify one.

Knowing what we are willing to promise does not yet tell an implementor which realizations would
satisfy the promise.

Requirements engineering asks: *what should we promise?* Specification — the subject of
@ch-specification — asks: *what exactly are we promising?*

## Summary

Requirements engineering turns uncertainty about what matters into obligations an engineering effort
is willing to accept. It therefore has two coupled tasks: discovering candidate requirements and
deciding which of them we can responsibly promise. Requirements come from more than user requests;
they can arise from operations, existing systems, contracts, regulations, standards, technology, and
the surrounding domain.

Discovery techniques buy different kinds of information. Asking, observing, comparing, prototyping,
and experimenting are useful under different uncertainties. But discovering value does not create a
requirement. Commitment introduces feasibility, lifecycle cost, opportunity cost, risk, professional
responsibility, and estimation. Requirements engineering does not eliminate uncertainty before
commitment. It reduces uncertainty enough that the commitment can be defended.

::: read_further
Nuseibeh, Bashar, and Steve Easterbrook. ["Requirements Engineering: A Roadmap."](https://doi.org/10.1145/336512.336523) In *Proceedings of the Conference on The Future of Software Engineering (ICSE '00)*, 35–46. New York: ACM, 2000. A concise map of the field — elicitation, modeling, analysis, negotiation, and evolution — that situates this chapter's discover-then-commit model within the discipline's larger structure.

Patton, Jeff. ["The New User Story Backlog Is a Map."](https://web.archive.org/web/20190718153846/https://www.jpattonassociates.com/the-new-backlog/) Jeff Patton & Associates, October 8, 2008. A practitioner's argument for organizing requirements around what users are trying to accomplish rather than a flat feature list — a working example of connecting purpose to the system.

Kostova, Blagovesta, Lucien Etzlinger, David Derrier, Gil Regev, and Alain Wegmann. ["Requirements Elicitation with a Service Canvas for Packaged Enterprise Systems."](https://doi.org/10.1109/RE.2019.00043) In *2019 IEEE 27th International Requirements Engineering Conference (RE)*, 340–350. IEEE, 2019. An industrial case study showing what a customer's initial requirements list failed to capture — the evidence behind "a list of requirements is not the ability to commit."
:::
