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

**Premise.** *Architecture establishes a strategy for organizing a system. Design determines how its parts will actually work within the responsibilities, affordances, and constraints that strategy creates. Designers progressively resolve the choices needed to turn those parts into implementations, while recognizing when an apparently local choice has consequences that require reconsidering the architecture.*

Architecture leaves us with parts that have responsibilities and rules for interacting. That does not make those parts implementations. A component responsible for processing work, for example, may still require decisions about its internal decomposition, representation of state, ownership of work, coordination of concurrent operations, handling of failure, algorithms, and dependencies.

But design is not simply the process of answering everything architecture left unspecified. Software is built inside an engineering environment. Frameworks, shared abstractions, coding conventions, common mechanisms, and organization-wide rules may already answer many questions without each component reconsidering them independently. Other choices are deliberately left open because their consequences are local. Design operates over the degrees of freedom that remain.

Sometimes a degree of freedom turns out not to be harmless. Detailed design may reveal that a supposedly local choice affects latency, consistency, security, failure isolation, changeability, or another system property. Components may turn out to have incompatible assumptions, or no satisfactory implementation may exist within the constraints the architecture imposed. What appeared to be a design detail has then exposed an architectural gap.

## From architecture to design

The Architecture unit described the relationship between architecture and design as strategy and tactics. Architecture establishes consequential organization and thereby constrains the engineering work below it. Design realizes responsibilities within those constraints.

This relationship is recursive. Architecture deliberately reasons about coarse-grained parts whose internals can temporarily be ignored. Design opens those parts and determines how they work. If an opened part is itself too large to reason about directly, engineers may establish an architecture for that part and design within it again.

The recursion eventually ends. As engineers work downward, they reach objects, functions, data structures, algorithms, or small collaborations whose relevant behavior can be reasoned about directly. Further architectural decomposition would no longer make the engineering problem easier to understand. Design then passes into implementation.

Architecture and design therefore do not have separate catalogs of techniques. Both may involve decomposition, interfaces, patterns, state machines, dependency graphs, quantitative models, and other engineering representations. Their role depends on scope and purpose: architecture establishes consequential constraints for the work below it; design realizes responsibilities within the constraints it inherits.

## What does design inherit?

A designer does not begin with a blank sheet of paper. At any particular level, several sources have already reduced the space of possible implementations.

Specification establishes properties that must remain true. Architecture establishes consequential organization, responsibilities, boundaries, interfaces, and interaction rules. The engineering environment supplies conventions, shared abstractions, frameworks, policies, and mechanisms that apply across many parts of the system.

What remains is a set of degrees of freedom: choices that have not yet been fixed. Not every degree of freedom deserves further engineering attention. Some choices are genuinely local, and allowing engineers to make them locally is valuable. Others should simply follow an established convention. Design judgment matters when a remaining choice has consequential alternatives.

Detailed design can also reveal that a choice was classified incorrectly. A decision that appeared local may affect several components or determine whether a system-level property can be achieved. A failure-handling decision may need to become a codebase-wide convention. A communication decision may need to become an architectural constraint. A newly discovered obligation may even require revisiting the specification.

Degrees of freedom are therefore provisional. Design can reveal that an apparent freedom should remain local, be captured as a shared engineering convention, or be elevated into an explicit architectural or specification constraint.

## Models of how the system works

Specification used models to make required properties explicit. Architecture used models to reason about consequential system organization. Design continues the same practice at another scale.

A design model makes some question about how a part works easier to answer than it would be from the implementation alone. If we ask whether two workers can process the same job simultaneously, we may need a model of ownership and lifecycle. If we ask whether an operation can occur before initialization, we may need a behavioral model. If we ask whether changing one collaborator will affect another, we may need a structural dependency model.

The same kinds of models can therefore appear in specification, architecture, and design. A state machine might specify externally observable behavior in one context and describe the internal lifecycle of a component in another. A graph might describe architectural dependencies at one scale and internal ownership at another. The representation does not determine the engineering level; the question and scope do.

A useful discipline is to ask four questions: What engineering question are we trying to answer? What model makes that question tractable? What property does the model allow us to state precisely? What engineering concern does that property serve?

A model earns its place by the question it settles, not by how much of the implementation it represents. The goal is not to produce one complete picture of how the system works.

## Making design choices

Once the relevant questions are visible, design becomes a process of choosing mechanisms and evaluating their consequences. Recurring questions include how a responsibility should be decomposed internally, where authoritative information and other state should live, how work should be coordinated, how directly parts should depend on one another, and when another level of indirection is worth its cost.

These questions rarely have universally correct answers. Indirection can isolate change but add complexity. Shared state can simplify coordination while coupling otherwise independent work. Asynchronous execution can isolate latency and failure while requiring explicit reasoning about ordering, retries, and idempotence. Additional decomposition can make responsibilities easier to reason about while increasing the number of relationships engineers must maintain.

As in architecture, recurring patterns provide alternatives and experience about their likely consequences. They do not provide a catalog of correct answers. The engineering task is to identify the problem, generate plausible alternatives, and choose according to the properties that matter in the particular context.

## When design feeds back

Design is an attempt to realize the strategy established by architecture. Failure to do so is engineering information.

Suppose an architecture assigns authoritative state to different components while a required operation must update that state consistently. Detailed design must explain how the property can actually be achieved. Perhaps a coordination mechanism solves the problem within the existing architecture. Perhaps the requirement can be weakened. But perhaps every plausible design introduces a dependency the architecture was intended to forbid. In that case, the architecture needs to change.

The same phenomenon occurs when a supposedly local decision repeatedly appears across components. If every designer independently needs to decide how deadlines propagate, how retries behave, or how ownership is represented, the problem may no longer be local. The engineering environment may need a common abstraction, convention, or enforceable rule.

Design therefore produces two kinds of output. It produces realizations of the responsibilities architecture assigned, but it also produces evidence about whether the inherited constraints and degrees of freedom were chosen correctly.

Faster implementation can make this feedback substantially cheaper. When prototypes, alternative implementations, refactorings, and experiments become inexpensive, engineers can investigate design choices that previously would have been settled largely through judgment. Rapid implementation can also expose related failures close enough together for engineers to recognize that several apparently local problems share one structural cause. Generative AI therefore need not merely make design faster: it can change what engineers are able to learn from design.
