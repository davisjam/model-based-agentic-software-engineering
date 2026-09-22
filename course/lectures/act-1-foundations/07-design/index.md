---
title: Design
readings:
  groups:
    - heading: Modularity and decomposition
      items:
        - cite: meyer1997oosc
          locator: 'chap. 2, "Modularity"'
          annotation: 'Meyer, *Object-Oriented Software Construction*, Chapter 2, "Modularity." Meyer develops a set of criteria for evaluating how software should be decomposed into modules, including decomposability, composability, understandability, continuity, and protection, and connects these criteria to principles such as information hiding. Read this chapter as a framework for judging a design, not as a recipe for producing one. In particular, ask whether a proposed decomposition lets engineers reason about parts independently, contains the effects of expected changes, and prevents details that should remain local from spreading through the system. These ideas provide much of the conceptual foundation for our discussion of internal decomposition and modularity.'
    - heading: Design as an iterative process
      items:
        - cite: parnas1986rational
          annotation: 'Parnas and Clements, ["A Rational Design Process: How and Why to Fake It"](https://doi.org/10.1109/TSE.1986.6312940) (1986). Pay attention to the year: 1986. Parnas and Clements describe software design as a process in which engineers construct and use models to guide development, while recognizing that the real process cannot proceed cleanly from requirements to design to implementation. Implementation reveals information, assumptions prove wrong, requirements change, and earlier decisions must be revisited. Read especially for two ideas: why models are needed to support systematic design, and why the actual process of discovering a good design is necessarily iterative. This is a fundamental property of software engineering because software is the engineering discipline of change: engineers can revise the artifact as they learn. Generative AI did not create this feedback loop; it can make the loop dramatically cheaper and faster.'
        - '["Design Docs at Google."](readings/design-docs-at-google.pdf) Design decisions need to be inspectable and debatable before they disappear into an implementation. This reading describes how engineers at Google use design documents to establish context, make goals and constraints explicit, propose a design, consider alternatives, expose unresolved questions, and obtain feedback from other engineers. Read it not primarily as a document template, but as an example of design reasoning made explicit: what does another engineer need to know in order to understand the problem, evaluate the proposed mechanisms, and challenge the assumptions behind them? Notice also the connection to Parnas and Clements: the actual discovery process may be messy and iterative even though the resulting document should preserve a coherent account of the design and its rationale. (Source: [industrialempathy.com/posts/design-docs-at-google](https://www.industrialempathy.com/posts/design-docs-at-google/).)'
    - heading: Design patterns
      items:
        - cite: gof1994
          locator: 'chaps. 1 and 6'
          annotation: 'Gamma et al., *Design Patterns*, Chapter 1, Facade, Command, and Chapter 6. This approximately 30-page selection introduces the idea of design patterns, gives two concrete patterns, and then reflects on what the pattern catalog means for software design more generally. Read it for the reasoning behind the patterns rather than the pattern names. For Facade and Command, ask what design problem motivates the additional structure, what dependencies or decisions it changes, what future variation it makes easier to accommodate, and what complexity it introduces in return. Chapter 6 is especially useful for stepping back from individual patterns and considering how recurring design experience can inform new designs. Patterns provide candidate mechanisms and accumulated experience about their consequences; they do not determine which mechanism is appropriate for a particular system.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
materials:
  - title: Lecture slides — Design
    src: 1-7-Design.pptx
---

**Premise.** *Design chooses mechanisms by which parts fulfill their responsibilities within inherited constraints.*

Architecture leaves us with consequential parts, responsibilities, boundaries, interfaces, and rules for interaction. Those decisions deliberately leave open how each part actually works. A service responsible for processing work may still require choices about algorithms, data structures, state representation, caching, concurrency, failure handling, and resource management. Design resolves such choices so that the part can fulfill its responsibility while satisfying the obligations it inherits.

Architecture can recur during this work. Opening a component may reveal that it is itself too large to reason about directly and should be organized into consequential subparts with distinct responsibilities and interactions. That is another architectural problem, now at a smaller scope; the Architecture unit gave us tools for reasoning about it. The distinctive concern of Design begins once the relevant organization is fixed: *How should this part actually work?*

## What does Design inherit?

A designer does not begin with a blank sheet of paper. At any particular scope, earlier engineering decisions have already reduced the space of possible implementations.

Specification establishes properties that must remain true. Architecture assigns responsibilities and establishes boundaries, interfaces, and interaction rules. The engineering environment supplies frameworks, conventions, shared abstractions, policies, and mechanisms that apply across many parts of the system. Together, these decisions constrain what a designer may sensibly choose.

What remains is a set of degrees of freedom: choices that have not yet been fixed. Design begins by deciding what kind of choice each one represents:

- **Follow.** An inherited decision already determines or sufficiently constrains the mechanism.
- **Choose.** Alternative mechanisms remain, and their consequential differences can be resolved within the responsibility being designed.
- **Escalate.** Choosing a satisfactory mechanism requires reconsidering something the design inherited.

Most of the distinctive work of Design lies in **choose**. The engineer knows what responsibility the part must fulfill and the constraints under which it must operate, but several mechanisms could plausibly do the job. Design is the engineering judgment required to choose among them.

## Choosing a mechanism

Suppose an architecture assigns document processing to a service deployed on a cloud worker. The service must satisfy its functional obligations while meeting a system cost goal. The cloud provider's pricing creates a consequential boundary: a worker requiring more than 4 GB of memory must use a more expensive two-core tier, and that additional cost would violate the goal.

Architecture does not need to determine how the service stays below 4 GB. That is a Design problem. The service might load an entire document into memory, process it through a bounded stream, or maintain a compact intermediate representation. Each mechanism may fulfill the same responsibility while differing in peak memory, latency, implementation complexity, and future changeability. If loading the document requires 6 GB while streaming requires 1 GB, the inherited cost obligation makes that difference consequential.

Design decisions take many forms. Engineers choose algorithms, data structures, state representations, caching and batching policies, scheduling and concurrency mechanisms, retry strategies, memory lifetimes, and internal control flow. Computer science provides many of the available mechanisms and helps us understand their properties. Design puts those mechanisms into an engineering context: *Which alternative should we use here, given the obligations this part must satisfy?*

The answer is rarely determined by one property. An in-memory representation may simplify an algorithm while consuming too much memory. A cache may improve latency while creating invalidation and consistency problems. Asynchronous processing may improve throughput or failure isolation while making ordering and retries harder to reason about. Indirection may isolate an expected change while adding another abstraction that engineers must understand and maintain. Design requires comparing the consequences that matter for the particular system rather than selecting mechanisms because they are familiar or fashionable.

## Reason about the consequences

A Design choice should be supported by enough evidence to distinguish among plausible mechanisms. What evidence is useful depends on what makes the alternatives consequential.

For the cloud worker, a memory model or measurement from a prototype might establish whether a candidate representation can remain below 4 GB. If latency separates two algorithms, a quantitative model or benchmark may be useful. If concurrent workers could process the same job, a lifecycle or state representation may expose whether the proposed coordination mechanism preserves ownership. If the uncertainty is primarily implementation complexity, building two small alternatives may be cheaper than trying to predict the difference.

The point is not to produce a particular kind of Design model. Models, analyses, prototypes, measurements, and implementations are ways of buying information about a choice. Use the evidence that makes the consequential difference among alternatives visible enough to decide.

Cheaper implementation changes these economics. When alternative mechanisms can be prototyped, measured, or discarded inexpensively, engineers can investigate choices that previously would have been settled largely through judgment. Generative AI can therefore accelerate an individual design, but its greater value may lie in making more Design choices cheap enough to investigate.

## Measurement for decision-making

A design decision predicts a tradeoff, and the prediction can be tested far more cheaply than it can be reversed later. The conditions are part of the evidence: the service that stays under 4 GB on the documents the team had at hand may exceed it on the documents users actually submit, so record the workload a design measurement was taken under. That record is what later lets someone notice the conditions no longer hold.

A probe answers a question without preserving the answer. Once the evidence exists, extract the relationship it revealed — the conditions under which the mechanism works, the tradeoff it embodies, the obligations future changes must preserve — and put it where the next engineer will meet it. Otherwise the knowledge is discarded with the throwaway code. Ask *did the chosen mechanism produce the tradeoff we chose it for?* A probe that says no may call for a different mechanism, or may be exactly the evidence that an inherited decision should be reopened.

## When the choice is not ours

Not every apparent degree of freedom should be resolved locally. If the engineering environment already establishes how dependencies are injected, how persistent state is accessed, or how retries behave, a component should normally follow that decision rather than invent another mechanism merely because alternatives exist. Shared mechanisms reduce the number of independent choices the system asks engineers to make.

Design can also reveal that an apparent choice must be escalated. Perhaps no plausible mechanism keeps the processing service below its memory limit while satisfying its other obligations. Perhaps the only workable mechanism requires moving authoritative state across a boundary the architecture deliberately established. Detailed reasoning has then produced evidence that an inherited decision should be reconsidered.

The destination depends on what was learned. A mechanism repeatedly needed across components may belong in the engineering environment. A conflict involving responsibilities, boundaries, or interactions may reopen Architecture. A newly discovered obligation may reopen Specification. Design does not silently work around these decisions; it exposes when they no longer provide a workable space of mechanisms.

Specification bounded acceptable behavior. Architecture organized responsibilities and interactions so those obligations could coexist. Design makes each part work by selecting mechanisms that satisfy what it inherits. Sometimes opening a part reveals another architectural problem; more often, the engineer must choose among algorithms, representations, data structures, and other mechanisms whose consequences differ in ways that matter.

---

**Read the expanded treatment:** [*The Software Engineering Handbook*, "Design" →](https://davisjam.github.io/model-based-agentic-software-engineering/book/se-handbook/07-design.html)
