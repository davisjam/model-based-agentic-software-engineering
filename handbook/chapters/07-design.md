---
id: design
title: Software Design
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

**Premise.** *Architecture establishes a strategy for organizing a system. Design determines how its
parts will actually work within the responsibilities, affordances, and constraints that strategy
creates.*

Architecture gave us parts. Each part has a responsibility. It has an interface. The surrounding
system has rules about how the part may interact with other parts. But a part is not yet an
implementation. A component responsible for generating advice, for example, may still require
decisions about its internal decomposition, state, ownership, dependencies, algorithms,
concurrency, failure handling, and coordination. Architecture deliberately hid those details so
engineers could reason about the larger system without opening every box at once. Design opens the
box.

Design is therefore less a phase than a class of engineering decisions. A designer identifies which
choices remain open, generates plausible alternatives, reasons about their consequences, chooses
among them, and makes consequential decisions inspectable so that later engineers do not have to
reconstruct the reasoning from the implementation alone.

::: {.definition #def-design title="Software design"}
Software design determines how an architectural part realizes its responsibility within the
obligations, affordances, and constraints it inherits. It operates over the degrees of freedom that
remain, progressively resolving them into mechanisms and implementations while recognizing when an
apparently local choice has consequences that belong elsewhere.
:::

This relationship is not simply "architecture is high-level, design is low-level." It is
recursive. A system may contain a subsystem. Opening the subsystem may reveal components. Opening a
component may reveal smaller parts. If one of those parts is still too substantial to reason about
directly, engineers may establish an architecture for it and design within that architecture again.

Eventually the recursion ends. Engineers reach objects, functions, data structures, algorithms, or
small collaborations whose relevant behavior is small enough to reason about directly. Further
consequential decomposition would no longer make the engineering problem easier to understand. At
that point, design passes into implementation.

## Design does not begin from a blank page {#sec-blank-page}

Opening an architectural box does not erase the decisions made above it. Suppose the architecture
gave us an Advice Service. The service has a responsibility and an interface. Specification may
also require that advice be returned within two seconds, that private data remain protected, or
that certain behavior remain correct under failure. When we open the Advice Service, those
obligations remain. Only its internals become our problem.

A designer therefore inherits decisions from at least three sources. Specification establishes
what must remain true. Architecture establishes the strategy within which the part must work. The
engineering environment establishes recurring decisions that engineers should not have to make
again.

Specification may constrain correctness, privacy, timing, security, or other properties.
Architecture assigns the part a responsibility, interface, boundaries, and permitted interactions.
The engineering environment may supply frameworks, shared abstractions, approved mechanisms, coding
conventions, failure policies, and organization-wide rules.

That third source matters. An organization may already require that persistent state be accessed
through repositories. Dependencies may be supplied through interfaces. Cross-service calls may
carry deadlines. Background work may use a standard queue with standard retry and dead-letter
behavior. Logging, authentication, configuration, serialization, or transaction handling may
already have approved mechanisms. These decisions may not appear on the system architecture
diagram, but they still constrain local design.

Good engineering environments deliberately answer recurring questions so that every component
designer does not have to rediscover an answer independently. They convert repeated judgment into
engineering structure. The implementation space is therefore already narrowed before local design
begins.

## Design operates over the remaining degrees of freedom {#sec-degrees-of-freedom}

@ch-specification introduced degrees of freedom as choices deliberately left open because their
permitted alternatives remain acceptable. The same idea now applies within an architectural part.
Specification removes choices inconsistent with the obligations. Architecture removes choices
inconsistent with the system strategy. The engineering environment removes choices the organization
has already standardized. What remains is the local design space.

The useful question is not: what could I possibly build? It is: which consequential choices are
actually still open? Not every open-looking choice should be treated the same way.

::: {.decision #decision-follow-choose-escalate title="Follow, choose, or escalate?"}
Follow when the question has already been answered by the engineering environment. Use the
established mechanism. Choose when the alternatives are genuinely local and satisfy everything the
component inherits. Escalate when the consequences escape the component — the decision may belong in
the engineering environment, the architecture, or the specification.
:::

This classification is provisional. A choice may look local until detailed work reveals its
consequences. Conversely, a question that initially appears consequential may turn out to be safely
governed by an existing mechanism. Design does not merely resolve degrees of freedom; it helps
discover which freedoms really are local.

Suppose retry behavior is standardized across the system. The component designer should follow the
standard mechanism rather than invent a local retry policy. Suppose two internal data structures
both satisfy the component's obligations and nothing outside the component depends on which is
chosen. That is a local design decision. But suppose choosing synchronous rather than asynchronous
work determines whether a system-level consistency or failure-isolation property can be satisfied.
What appeared to be a local degree of freedom is not local after all. Design judgment begins by
classifying the choice correctly.

## Architecture is strategy; design is tactics {#sec-strategy-tactics}

The relationship between architecture and design is usefully described as strategy and tactics.
Architecture establishes consequential organization and creates a space of possible tactics. Design
chooses mechanisms within that space.

A building architect may determine where a wall stands, how deep it is, where service space exists,
and what penetrations are allowed. The plumbing designer inherits those decisions. They do not
prescribe the exact plumbing layout, but they determine which layouts are practical. Software
architecture works the same way. A boundary, interface, dependency rule, or deployment choice
creates affordances and constraints for the design inside the part.

This relationship is relative to scope. A subsystem may be tactical relative to the system
architecture while having an architecture of its own. Architecture and design are therefore not two
fixed heights in a hierarchy. The useful scope question is: *which decisions are we taking as given,
and which decisions are we making within them?*

## Models of how a part works {#sec-part-models}

Specification used models to make obligations explicit. Architecture used models to reason about
consequential organization. Design uses the same modeling discipline at a smaller scope.

Consider again the Advice Service. Suppose it contains a loader, an advice model, a validator, and a
formatter. Different engineering questions require different reductions of that same component. If
we ask: can a request return advice before validation completes? — we need a behavioral model
showing the allowed sequence of actions. If we ask: can two requests mutate the same working state?
— we need an ownership or lifecycle model showing which state is shared and for how long. If we
ask: can the advice model be replaced without changing validation? — we need a structural
dependency model. If we ask: can the component meet a two-second response budget? — we need a
quantitative model with timings or other relevant costs. The component did not change. The
engineering question changed, so the useful model changed.

::: {.key-idea #key-question-determines-reduction title="The question determines the reduction"}
Ask: What engineering question are we trying to answer? What model makes that question tractable?
What property can we state over that model? What engineering concern does that property serve? A
model earns its place by the question it settles.
:::

There is no single artifact that is "the design." Several representations may coexist because they
answer different questions about the same part. Nor does a particular notation make a
representation a design model. A state machine, dependency graph, table, sequence, equation, or
prose description earns its place only when it makes a consequential design question easier to
answer.

## Making design reasoning inspectable {#sec-inspectable-reasoning}

A consequential design decision should not exist only in the resulting code. By the time an
implementation exists, an engineer can often see what was built but not why one mechanism was
chosen over another, which alternatives were rejected, what assumptions supported the decision, or
what evidence would justify revisiting it.

A design document makes that reasoning inspectable before and after implementation. Its useful
content follows directly from the decision process in this chapter: context and inherited
constraints → open question → plausible alternatives → proposed design → model or evidence →
tradeoffs → unresolved questions. The exact document format matters less than preserving enough of
the argument for another engineer to evaluate the choice.

::: {.key-idea #key-design-doc-externalizes title="A design document externalizes a decision"}
A design document is a representation of a consequential decision before that decision disappears
into code. Record enough context, alternatives, evidence, and rationale that another engineer can
challenge the choice now and understand it later.
:::

Review then becomes part of design rather than a ceremonial approval step. Another engineer can
challenge an assumption, identify an alternative, or notice a consequence that the original
designer missed before the decision becomes expensive to reverse.

## Recurring design choices {#sec-recurring-choices}

Some design questions recur often enough that engineers have accumulated experience about plausible
solutions and their consequences. This experience appears in conventions, libraries, frameworks,
design patterns, and the engineering environment itself. The value is not the name attached to a
solution. It is the accumulated answer to three questions: What recurring problem does this
structure address? What alternatives exist? What consequences does this one introduce?

A design pattern therefore packages prior engineering experience. It expands the designer's
candidate set without making the decision for them. Patterns are useful as stored design
experience, not as a checklist of structures a sophisticated design ought to contain.

### Who owns the truth? {#sec-owns-truth}

Many systems contain several representations of the same information. One may be authoritative.
Another may be derived. Another may be cached or replicated. The key question is: when the
representations disagree, which one wins? A design that cannot answer this question has not merely
left implementation detail open. It has left the system's source of truth ambiguous.

::: {.definition #def-authoritative-state title="Authoritative state"}
Authoritative state is the representation whose value governs when multiple representations
disagree.
:::

Other representations can be useful without being authoritative. A cached value may improve latency.
A derived view may make queries cheaper. A replicated copy may improve availability. But the design
should make clear whether such representations can originate truth or only reflect it. Authority is
therefore a design decision about responsibility for state.

### What consistency must copies provide? {#sec-consistency}

Replicated or cached state creates a second question. Suppose one reader must always observe the
latest completed write. That requirement implies one set of coordination mechanisms. Suppose
instead that readers may temporarily observe an older value. That permits different mechanisms and
different failure behavior. The design question is therefore not simply are there replicas? It is:
what observations must the system permit or forbid when copies disagree?

Tighter consistency can simplify reasoning for clients but require more coordination and increase
latency or reduce availability under some failures. Looser consistency can improve availability and
reduce coordination while forcing the surrounding design to tolerate stale or divergent
observations. Replication topology does not determine the required semantics. Requirements do.

::: {.tradeoff #tradeoff-consistency title="Consistency"}
Tighter observation guarantees buy simpler assumptions for clients by spending coordination. Weaker
guarantees buy autonomy, availability, or latency by requiring the system to tolerate temporary
disagreement.
:::

### Must this work happen now? {#sec-work-now}

Some work can occur synchronously with a request: request → work → result. The caller waits until
the work completes. Other work can be deferred: request → queue → acknowledgement, with a worker
completing the operation later.

Immediate work provides simple completion semantics. When the request returns successfully, the
result exists. But the caller pays the latency and often inherits failures from everything on the
critical path.

Deferred work can isolate latency and failure, but the design now has to answer additional
questions: What happens when processing fails? May the work be retried? Can the same operation
safely run twice? Does ordering matter? How does the caller learn that deferred work eventually
failed?

::: {.tradeoff #tradeoff-immediate-deferred title="Immediate or deferred"}
Immediate work buys immediacy and simple completion semantics. Deferred work buys latency and
failure isolation. Deferral moves complexity into retries, idempotence, ordering, and eventual
completion.
:::

As elsewhere in design, the mechanism does not remove the engineering problem. It moves it.

### How directly should parts depend on one another? {#sec-dependence}

Suppose A needs behavior from B. The simplest design is direct: A → B. Sometimes that is exactly
right. Alternatively, engineers can insert an interface, adapter, factory, proxy,
dependency-injection seam, or other indirection: A → I ← B.

Indirection buys isolation. A can depend on an abstraction that changes less frequently than B's
concrete realization. But indirection also costs something. There are now more concepts, more
relationships, more code, and more places to look when understanding the system.

::: {.tradeoff #tradeoff-indirection title="Indirection"}
Indirection buys flexibility by spending complexity. Before adding a seam, ask: what future change
are we buying isolation from? If the answer is unclear, the indirection may be speculative
complexity.
:::

A direct dependency is not a sign of immature design. An additional abstraction is not automatically
sophisticated. The mechanism should correspond to a plausible source of change or another
consequential property.

Design patterns often package particular forms of this move. A Facade, for example, introduces a
stable, simpler interface in front of a more complicated subsystem. That can contain knowledge of
the subsystem and reduce dependencies on its internals, but it also creates another interface whose
promises must be maintained. The engineering question is therefore not: should we use Facade? It
is: what dependency or expected change are we buying isolation from, and is that isolation worth
the additional structure?

### How should a responsibility be decomposed? {#sec-decomposition}

A responsibility can often be decomposed in several ways. One design may divide work according to
processing steps: Step 1 → Step 2 → Step 3. Another may organize the same work around a decision
expected to change, placing a stable seam around the part likely to vary. Both decompositions can
produce correct behavior. The design question is what each decomposition makes local.

Classical work on information hiding argues that likely sources of change should be hidden behind
stable interfaces. Meyer [-@meyer1997] develops the broader engineering question: what properties
make a decomposition useful? Rather than memorizing criteria, use them as tests of a proposed
design.

- Can a part be understood without reconstructing the whole? A decomposition should support local
  reasoning.
- Can an expected change remain local? Decisions likely to vary should not unnecessarily spread
  through unrelated parts.
- Can useful parts be reused or recombined? A module whose meaning depends on the entire original
  context is difficult to compose elsewhere.
- Can a local failure remain local? Boundaries can sometimes contain faults and prevent one
  internal problem from corrupting unrelated work.

These tests can point in different directions. Additional decomposition may improve change
containment while introducing more interfaces, dependencies, and concepts. A seam that isolates no
plausible source of change may merely make the system harder to understand.

::: {.tradeoff #tradeoff-decomposition title="Decomposition"}
More decomposition can localize understanding, change, composition, or failure. Less decomposition
preserves directness and reduces the number of relationships engineers must maintain. When
comparing decompositions, ask what each decomposition makes local.
:::

Design is therefore not a search for the maximum number of modules or abstractions. It is a search
for a decomposition whose locality matches the changes, reasoning, reuse, and failures that matter
in this part of the system.

## Every design choice trades one problem for another {#sec-trades-problems}

The recurring choices above have the same shape. Who owns truth? Central authority may simplify
consistency while increasing coordination. How consistent must copies be? Tighter consistency
reduces ambiguity while increasing coordination or latency. Must work happen immediately? Immediate
work simplifies completion while coupling the caller to latency and failure. How directly should
parts depend? Directness reduces complexity while increasing exposure to change. How much
decomposition should we introduce? More seams can localize change while creating more relationships
to understand. There is rarely a side labeled "good." The designer's job is to make the tradeoff
explicit enough that it can be defended.

::: {.key-idea #key-fit-consequences title="Design fits consequences to the problem"}
Design is not choosing the conventionally virtuous side of a tradeoff. It is choosing which
consequences fit the obligations and context of the component being engineered.
:::

A defensible design can therefore name the inherited constraints, identify the open choice, compare
serious alternatives, explain the consequences that distinguish them, and show the model or
evidence supporting the choice. This is the reasoning a useful design document preserves.

## Design tests whether the strategy is workable {#sec-tests-strategy}

Architecture (@ch-architecture) created the space in which design must operate. Sometimes a
satisfactory tactic fits inside that space. Sometimes it does not. Detailed design therefore does
more than fill in decisions made above it. It produces evidence about whether those decisions were
workable.

A clean account of engineering can appear to proceed in one direction: requirements →
specification → architecture → design → implementation. Real design has never worked so neatly.
Parnas and Clements made this point in 1986 [@parnasclements1986]: implementation reveals
information that was unavailable earlier, assumptions prove wrong, requirements change, and
attempted realizations expose weaknesses in prior decisions. Engineers need a rational account of
the design, but the process by which they discover that design is necessarily iterative.

This is especially natural in software because software is the engineering medium of change. We can
revise the artifact as construction teaches us more about the problem. The downward progression in
this book is therefore a way of separating engineering questions, not a claim that engineers learn
the answers in that order.

Return to the building wall. The architect provided a service space intended to accommodate
plumbing. If the required pipe fits, the architecture successfully afforded a workable design.

Suppose instead that the required bend cannot fit within the available depth. The plumbing designer
might search for another route. But if every plausible route fails, the conclusion is not merely
that the plumbing designer needs to try harder. The detailed design has produced information about
the architecture. Perhaps the wall must move. Perhaps the service space must grow. Perhaps the
requirement that created the pipe must change. Software design produces the same kind of feedback.

### A degree of freedom can reveal an architectural gap {#sec-freedom-reveals-gap}

Suppose the architecture leaves one interaction mechanism unspecified. The designer considers
synchronous coordination. That choice violates the system's required failure isolation or latency.
The designer considers asynchronous coordination. That choice cannot satisfy the required
consistency semantics. There is no satisfactory local answer.

What appeared to be a design freedom has exposed an architectural question. The correct response is
not to force a clever workaround into the local implementation. It is to escalate the decision. A
choice can look local until its consequences escape the box. A degree of freedom is therefore
provisional until experience shows that its consequences really do remain local.

### A local workaround can make the architecture false {#sec-workaround-false}

There is another dangerous response to an inconvenient architectural constraint: quietly violate
it. Suppose the architecture says A → Port → B. The architectural model assumes no dependency
crosses the port into B's internals. An engineer discovers that one feature would be easier if A
reached directly into B. So they do. The feature works. The tests pass. And the architecture is now
false.

This has the obvious local cost of additional coupling, but the deeper problem is epistemic.
Earlier, engineers may have used the architectural dependency model to answer: can B be replaced
without changing A? The model says yes. The implementation now says no. Architectural degradation
therefore destroys the predictive value of engineering knowledge. It is not merely untidy code or
an aesthetic failure. A model that no longer corresponds to the system can support incorrect
engineering decisions. Architecture made a property analyzable; the hidden design change has made
that analysis untrustworthy. This can happen on the first day of implementation. It does not
require decades of accumulated legacy code.

### Consequential discoveries must become engineering knowledge {#sec-discovery-knowledge}

Design routinely exposes information that was unavailable at higher levels. The question is where
that information belongs.

If the consequence is genuinely local, keep the answer in the local design. If the same decision
keeps recurring across components, the engineering environment may need a shared convention or
mechanism. If the decision affects system structure or cross-component properties, Architecture may
need to change. If the discovery changes what must be true of an acceptable system, Specification
may need to change.

::: {.decision #decision-where-discovery-belongs title="Where does the discovery belong?"}
Local consequence → Design. Recurring across parts → Engineering environment. System structure →
Architecture. Missing or changed obligation → Specification.
:::

A workaround should never remain invisible. Remove it if it was a mistake. Model it if it is a
legitimate exception. Change the rule if repeated exceptions show that the rule itself was wrong.
Repeated experience should leave the engineering environment smarter than it found it. Design
discovers which apparent freedoms are actually consequential and where the resulting knowledge
belongs.

## Implementation can become a design probe {#sec-implementation-probe}

Implementation has always produced information about design. What changes with cheaper
implementation is how deliberately and how often engineers can use it for that purpose.
@ch-architecture described models, prototypes, and measurements as ways to buy information about
uncertainty. At design scale, implementation itself can become an information-gathering instrument.

Historically, constructing multiple candidate implementations could be too expensive merely to
learn from them. Engineers therefore settled many design questions primarily through prior
experience, models, and judgment.

When implementation becomes much cheaper, that calculation changes. An engineer can construct two
candidate data representations and measure them. They can prototype immediate and deferred
mechanisms. They can perform an experimental refactoring. They can implement a competing design and
discard it after learning what they needed. Implementation can become a design probe rather than
only the terminal realization of a decision. The question remains economic: will the evidence produced by implementing this alternative be worth
more than the implementation costs?

## Velocity can change what engineers notice {#sec-velocity-notice}

Cheap implementation has another effect. Suppose three related design failures arise weeks apart.
Each appears in its own local context. Each is repaired independently. Now suppose implementation
and change occur quickly enough that those same failures appear in dense succession. The engineer
may recognize that they are related. What looked like several local incidents may reveal one
structural cause.

This does not imply that high velocity automatically produces better design. It creates an
opportunity. Temporal compression can turn incidents into evidence of structure. Related failures
that would have been separated by weeks may become co-visible. That can change the question from
how do I repair this incident? to what structure keeps producing this class of incident? That is a
different kind of design reasoning.

## Cheap code can create a firehose of evidence {#sec-evidence-economics}

Cheaper implementation changes design reasoning in two ways. The first is economic. Engineers can
afford to try more alternatives: competing implementations, prototypes, measurements, and
refactorings become cheaper sources of evidence. The second is epistemic. Changes and failures can
arrive densely enough that relationships among them become visible sooner.

At sufficiently high implementation velocity, however, another constraint appears: human attention.
An engineer cannot inspect every generated change in detail. The scarce work moves upward. Many
implementations and failures can become a stream of evidence from which an engineer must decide
what is local, what is structural, and what recurring lesson should become durable engineering
knowledge.

::: {.mage-moment title="Cheap code, costly judgment"}
In the *Cheap Code, Costly Judgment* case study, related failures sometimes appeared in dense
succession rather than being separated across long periods of development. Their proximity helped
the architect recognize that several local incidents reflected a common architectural weakness. The
response was not to review and repair every change individually. It was to alter the engineering
environment: introduce a model, derive new checks from it, and close several related failure
classes at once.

Cheap code creates a firehose of evidence. Costly judgment determines what it means.
:::

This does not transfer engineering judgment to the implementation tool. The engineer still decides
what property matters, what evidence is relevant, whether several failures share a cause, what
tradeoff is acceptable, and whether a discovery belongs in local design, the engineering
environment, architecture, or specification.

Implementation velocity therefore does not merely let us realize a design faster. It can let us
reason about the design differently.

## From Specification to Implementation {#sec-spec-to-implementation}

The progression is now complete. Requirements determines what the engineering effort is willing to
promise. Specification constrains the space of acceptable realizations. Architecture chooses
consequential organization for one acceptable realization. Design opens the resulting parts and
determines how they realize their responsibilities.

If a part remains too large to reason about directly, the relationship recurs. Engineers establish
architecture at that scope and design within it. Eventually the work reaches entities whose relevant
behavior can be reasoned about directly. Then we implement them.

The progression describes how engineering decisions depend on one another; it does not prescribe
the chronological order in which engineers discover them. Constraints and affordances flow downward
from requirements, specification, architecture, and the engineering environment. Evidence flows
upward from implementation and design. Detailed work can expose a bad tactic, an architectural gap,
a missing shared mechanism, or an obligation that needs reconsideration. That feedback is part of
engineering rather than a failure of the process.

Engineering therefore proceeds downward through constraints and upward through evidence.
Architecture constrains the available tactics. Design tests whether the strategy is workable.

## Summary

Architecture gives design a strategy rather than a blank page. A designer inherits specification
obligations, architectural responsibilities and interaction rules, and recurring decisions already
captured in the engineering environment. Design operates over the degrees of freedom that remain:
follow existing mechanisms where the question has already been answered, choose locally where
consequences remain local, and escalate when an apparent freedom affects larger properties.

Design is decision-making within those inherited constraints. Models make consequential questions
tractable; design documents make the resulting reasoning inspectable. Recurring choices about
authority, consistency, timing, indirection, and decomposition are tradeoffs rather than
universally correct patterns. Patterns contribute accumulated experience about plausible tactics
and their consequences. A good decomposition makes the right things local: understanding, expected
change, useful composition, or failure.

Design is also necessarily iterative. Implementation and detailed design reveal information that
was unavailable earlier, so evidence flows upward even as constraints flow downward. An apparently
local choice can expose an architectural gap, a missing shared mechanism, or even an obligation
that needs reconsideration. Generative AI did not create this feedback loop. By making
implementation cheaper and evidence denser, it can make the loop faster and change what engineers
are able to notice.

Architecture constrains the available tactics. Design tests whether the strategy is workable.

::: read_further
Meyer, Bertrand. *Object-Oriented Software Construction*. 2nd ed. Upper Saddle River, NJ: Prentice Hall, 1997. Develops criteria for judging whether a decomposition makes understanding, change, composition, and failure sufficiently local. Focus on the "Modularity" chapter.

Parnas, David L., and Paul C. Clements. ["A Rational Design Process: How and Why to Fake It."](https://doi.org/10.1109/TSE.1986.6312938) *IEEE Transactions on Software Engineering* SE-12, no. 2 (1986): 251–57. The classic explanation of why rational design descriptions remain useful even though real design is iterative.

["Design Docs at Google."](https://www.industrialempathy.com/posts/design-docs-at-google/) A practical account of making consequential design reasoning inspectable before it disappears into implementation.

Gamma, Erich, Richard Helm, Ralph Johnson, and John Vlissides. *Design Patterns: Elements of Reusable Object-Oriented Software*. Reading, MA: Addison-Wesley, 1994. Patterns package accumulated design experience, expanding the candidate set without determining which tactic fits a particular system. Read the introductory and concluding chapters, plus the "Facade" and "Command" patterns.
:::
