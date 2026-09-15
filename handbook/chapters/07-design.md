---
id: design
title: Design
short_title: Design
order: 7
status: draft
description: >
  Design determines how an architectural part realizes its responsibility within the obligations,
  affordances, and constraints it inherits. It classifies the remaining degrees of freedom — follow,
  choose, or escalate — works through the recurring design tradeoffs, and produces evidence that
  tests whether the architecture's strategy is workable.
objectives:
  - Identify what a design inherits from specification, architecture, and the engineering environment.
  - Classify a remaining degree of freedom as one to follow, choose locally, or escalate.
  - Reason through recurring design tradeoffs (authority, consistency, timing, indirection, decomposition) by mechanism.
  - Recognize when detailed design has exposed an architectural gap or a missing shared rule, and route the discovery to where it belongs.
---

**Premise.** *Design chooses mechanisms by which parts fulfill their responsibilities within inherited constraints.*

Architecture establishes consequential parts, assigns responsibilities, and defines important boundaries and interactions.
These decisions constrain the system without determining how each part works internally.
A service responsible for processing work may still require choices about algorithms, data structures, state representation, caching, concurrency, failure handling, and resource management.
Design resolves these choices so that each part can fulfill its assigned responsibility while satisfying the obligations it inherits.

Architecture can recur during design.
Examining a component may reveal that it is itself too large to reason about directly and should be organized into consequential subparts with distinct responsibilities and interactions.
This creates another architectural problem at a smaller scope.
Once the relevant organization is sufficiently established, however, a different judgment remains: *How should this part work?*
That is the central question of design.

## What Design inherits

Design does not begin from an unconstrained set of possible implementations.
Earlier engineering decisions have already reduced that space.
Specification establishes properties that must remain true.
Architecture assigns responsibilities and establishes boundaries, interfaces, and interaction rules.
The engineering environment may supply frameworks, conventions, shared abstractions, policies, and mechanisms that apply across many parts of the system.

The choices not already determined are the remaining degrees of freedom.
For each consequential choice, the designer must determine whether to **follow**, **choose**, or **escalate**.
Follow applies when an inherited decision already determines or sufficiently constrains the mechanism.
Choose applies when several mechanisms remain viable and their consequential differences can be resolved within the responsibility being designed.
Escalate applies when no satisfactory mechanism can be selected without reconsidering an inherited decision.

The distinctive work of design lies primarily in choose.
The responsibility of the part and the constraints under which it must operate are known, but several mechanisms could plausibly satisfy them.
The engineering task is to identify which differences among those mechanisms matter and select accordingly.

## Choosing mechanisms

Consider a document-processing service deployed on a cloud worker.
Its architecture assigns responsibility for processing documents to the service, while system requirements constrain operating cost.
Suppose the cloud provider's pricing makes memory consumption consequential: a worker requiring more than 4 GB of memory must use a more expensive tier, causing the system to exceed its cost target.

The architecture need not determine how the service remains below 4 GB.
Several mechanisms may satisfy the same responsibility.
The service might load an entire document into memory, process it through a bounded stream, or construct a compact intermediate representation.
These alternatives differ in peak memory, latency, implementation complexity, and changeability.
If whole-document processing requires 6 GB while streaming requires 1 GB, the inherited cost constraint makes memory consumption a consequential property of the design.

Design decisions take many forms.
Engineers select algorithms, data structures, state representations, caching and batching policies, scheduling and concurrency mechanisms, retry strategies, memory lifetimes, and internal control flow.
Computer science supplies many of these mechanisms and theories for understanding their properties.
Design concerns their use in a particular engineering context: *Which mechanism should be used here, given the obligations this part must satisfy?*

A choice is rarely determined by one property.
An in-memory representation may simplify an algorithm while consuming excessive memory.
A cache may reduce latency while introducing invalidation and consistency problems.
Asynchronous processing may improve throughput and failure isolation while complicating ordering and retries.
Indirection may isolate an expected change while introducing another abstraction that engineers must understand and maintain.
The relevant comparison therefore depends on the obligations of the particular system rather than on whether a mechanism is generally considered desirable.

## Evidence for a Design decision

A consequential design choice requires enough evidence to distinguish among plausible mechanisms.
The appropriate evidence depends on the properties that separate the alternatives.

For the cloud worker, a memory model or prototype measurement might establish whether a representation remains below 4 GB.
If latency distinguishes two algorithms, an analytical model or benchmark may be appropriate.
If concurrent workers can process the same job, a lifecycle or state model may expose whether a coordination mechanism preserves ownership.
When implementation complexity is the principal uncertainty, implementing small versions of competing alternatives may provide better evidence than attempting to predict their relative costs.

Models, analyses, prototypes, measurements, and implementations are therefore means of reducing uncertainty about a design choice.
No particular representation is intrinsically required by design.
The useful representation is the one that exposes the consequential differences among alternatives with sufficient confidence to support the decision.

Generative AI changes the cost of obtaining some of this evidence.
When alternative mechanisms can be implemented, measured, and discarded inexpensively, engineers can investigate choices that previously would have been resolved largely through experience or prediction.
Cheaper implementation does not remove the design decision.
It can instead make empirical comparison economical for a larger class of decisions.

## Following and escalating

Some apparent degrees of freedom should not be resolved locally.
If the engineering environment already establishes how dependencies are injected, persistent state is accessed, or retries are performed, a component should ordinarily follow that decision.
Allowing each component to choose independently would increase the number of mechanisms that engineers must understand and the number of interactions the system must accommodate.

Design can also establish that an apparent local choice must be escalated.
Suppose no plausible processing mechanism can remain below the worker's memory limit while satisfying the service's other obligations.
Alternatively, suppose the only viable mechanism requires moving authoritative state across a boundary established by the architecture.
In either case, design has produced evidence that the inherited constraints do not admit a satisfactory mechanism.

What should be reconsidered depends on the source of the conflict.
A mechanism needed repeatedly across components may belong in the engineering environment.
A conflict involving responsibilities, boundaries, or interactions may require an architectural change.
Discovery of a previously unstated obligation may reopen specification.
Escalation preserves the distinction among these decisions: design should not silently compensate for a problem created by an earlier engineering choice.

## Summary

Design determines how parts fulfill responsibilities that earlier engineering decisions have assigned to them.
It begins with inherited obligations and identifies the consequential degrees of freedom that remain.
Some choices should follow decisions already encoded elsewhere; some require the engineer to choose among alternative mechanisms; and some should escalate because the inherited constraints do not admit a satisfactory local solution.

For choices that remain local, engineers compare mechanisms according to the consequences that matter for the system and gather evidence sufficient to distinguish among plausible alternatives.
Algorithms, data structures, representations, concurrency mechanisms, caching policies, and similar implementation mechanisms become design decisions when their differences affect obligations the system must satisfy.
Design therefore reduces the remaining degrees of freedom while preserving the responsibilities and constraints established by specification, architecture, and the engineering environment.

::: read_further
Meyer, Bertrand. *Object-Oriented Software Construction*. 2nd ed. Upper Saddle River, NJ: Prentice Hall, 1997. Develops criteria for judging whether a decomposition makes understanding, change, composition, and failure sufficiently local. Focus on the "Modularity" chapter.

Parnas, David L., and Paul C. Clements. ["A Rational Design Process: How and Why to Fake It."](https://doi.org/10.1109/TSE.1986.6312938) *IEEE Transactions on Software Engineering* SE-12, no. 2 (1986): 251–57. The classic explanation of why rational design descriptions remain useful even though real design is iterative.

["Design Docs at Google."](https://www.industrialempathy.com/posts/design-docs-at-google/) A practical account of making consequential design reasoning inspectable before it disappears into implementation.

Gamma, Erich, Richard Helm, Ralph Johnson, and John Vlissides. *Design Patterns: Elements of Reusable Object-Oriented Software*. Reading, MA: Addison-Wesley, 1994. Patterns package accumulated design experience, expanding the candidate set without determining which tactic fits a particular system. Read the introductory and concluding chapters, plus the "Facade" and "Command" patterns.
:::
