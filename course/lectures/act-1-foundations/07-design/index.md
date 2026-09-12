---
title: Software Design
readings:
  groups: []
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
materials: []
---

**Premise.** *Architecture establishes a strategy for organizing a system. Design determines how its parts will actually work within the responsibilities, affordances, and constraints that strategy creates. Designers must decide which internal mechanisms matter, represent them at enough detail to reason about their consequences, and recognize when an apparently local decision reveals a problem with the architecture itself.*

Architecture left us with parts that have responsibilities and rules for interacting. That does not make those parts implementations. A component responsible for processing jobs, for example, may still need decisions about how work is represented, who owns a job at each moment, where state lives, how concurrent operations coordinate, what happens after failure, and which dependencies should be mediated through another abstraction.

But design is not simply the process of answering everything architecture left unspecified. Software is built inside an engineering environment. Frameworks, shared abstractions, coding conventions, common mechanisms, and organization-wide rules may already answer many questions without each component reconsidering them independently. Other decisions are deliberately left free because their consequences are local. Design operates over the degrees of freedom that remain.

Sometimes a degree of freedom turns out not to be harmless. Detailed design may reveal that two locally reasonable choices have different consequences for latency, consistency, security, failure isolation, or another system property. It may reveal that components have incompatible assumptions, or that no implementation within the current constraints can satisfy the specification. What appeared to be a design detail has then exposed an architectural gap.

Architecture constrains the available tactics. Design tests whether the strategy is workable.

## From architecture to design

The distinction between architecture and design is best understood as strategy and tactics, not simply as high-level and low-level decisions.

At the system level, architecture may establish a processing subsystem, assign it responsibility for a class of work, define which other parts it may depend on, and require failures within it not to affect another subsystem. Design then asks how that processing subsystem can realize those responsibilities.

The relationship recurs. Once engineers open the processing subsystem, they may discover that it itself needs several consequential parts with responsibilities, boundaries, and interaction rules. At that scale, those decisions form an architecture for the subsystem, and the implementation of its parts again requires design.

Architecture and design therefore do not have separate catalogs of techniques. Both may use decomposition, interfaces, patterns, state machines, dependency graphs, quantitative models, and other engineering representations. The distinction is the role the decision plays: architecture establishes consequential constraints for the work below it; design realizes responsibilities within the constraints it inherits.

## What does design inherit?

A designer does not begin with a blank sheet of paper. At any particular level, several sources have already reduced the space of possible implementations:

- **Specification** establishes properties that must remain true.
- **Architecture** establishes consequential organization, responsibilities, boundaries, interfaces, and interaction rules.
- **The engineering environment** supplies conventions, shared abstractions, frameworks, policies, and mechanisms that apply across many parts of the system.

What remains is a set of degrees of freedom: choices that have not yet been fixed.

Not every degree of freedom deserves further engineering attention. Some choices are genuinely local, and allowing engineers to make them locally is valuable. Others can be resolved by following an established convention. Design judgment matters most when a remaining choice has consequences for properties we care about.

Detailed design can also teach us that we classified a decision incorrectly. A choice that appeared local may affect several components or determine whether a system-level property can be achieved. A failure-handling decision may need to become a codebase-wide convention. A communication decision may need to become an architectural constraint. A newly discovered obligation may even require revisiting the specification. Degrees of freedom are therefore provisional: design can reveal that an apparent freedom should instead become durable engineering knowledge or an explicit constraint.

## Models of how the system works

Specification used models to make required properties explicit, and Architecture used models to reason about consequential system organization. Design continues the same practice at another scale.

A design model is useful because it makes some question about how a part works easier to answer than it would be from the implementation alone. The engineering question determines the model. If we ask whether two workers can process the same job simultaneously, we may need a model of ownership and lifecycle. If we ask whether an operation can occur before initialization, we may need a behavioral model. If we ask whether changing one collaborator will affect another, we may need a structural dependency model.

The same kinds of models can therefore appear in specification, architecture, and design. A state machine might specify externally observable behavior in one context and describe the internal lifecycle of a worker in another. A graph might describe architectural dependencies or internal ownership. The representation does not determine the engineering level; the question and scope do.

A useful discipline is:

> *Engineering question → Model → Property → Engineering concern*

A model earns its place by making some consequential claim easier to state, inspect, or analyze. The goal is not to produce a complete picture of the implementation.

## Making design choices

Once the relevant questions are visible, design becomes a process of choosing mechanisms and evaluating their consequences. Recurring questions include how responsibilities should be decomposed internally, where authoritative information and other state should live, how concurrent work should be coordinated, how directly parts should depend on one another, and when another level of indirection is worth its cost.

These questions rarely have universally correct answers. Indirection can isolate change but add complexity. Shared state can simplify coordination but couple otherwise independent work. Asynchronous execution can isolate latency and failure but require explicit reasoning about ordering, retries, and idempotence. Additional decomposition can make responsibilities easier to reason about while increasing the number of relationships engineers must maintain.

As in architecture, patterns are useful because they provide recurring alternatives and experience about their likely consequences. They are not a catalog of answers. The engineering task is to identify the problem, generate plausible alternatives, and choose according to the properties that matter in this context.

## When design feeds back

Design is an attempt to instantiate the strategy established by architecture. Failure to do so is engineering information.

Suppose an architecture assigns authoritative state to two different components while a required operation must update both atomically. Detailed design now has to explain how that property can actually be achieved. Perhaps a coordination mechanism solves the problem within the existing architecture. Perhaps the requirement can be weakened. But perhaps every plausible design introduces a dependency the architecture was intended to forbid. In that case, the architecture needs to change.

The same phenomenon occurs when a supposedly local decision repeatedly appears across components. If every designer independently needs to decide how deadlines propagate, how retries behave, or how ownership is represented, the problem may no longer be local. The engineering environment may need a common abstraction, convention, or enforceable rule.

Design therefore produces two kinds of output. It produces realizations of the responsibilities architecture assigned, but it also produces evidence about whether the inherited constraints and freedoms were chosen correctly.

Generative AI can make this feedback loop substantially faster. When implementations, prototypes, refactorings, and experiments become cheaper, engineers can test more candidate designs. Related failures may also appear close enough together in time for engineers to recognize that what looked like several local problems is one structural problem. Faster implementation therefore need not merely accelerate existing design work; it can change what engineers are economically and epistemically able to learn about the design.
