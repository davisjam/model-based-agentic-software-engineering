---
title: Engineering Knowledge
readings:
  groups:
    - heading: Distributed cognition
      items:
        - '["How a Cockpit Remembers Its Speeds."](https://doi.org/10.1207/s15516709cog1903_1) Hutchins, 1995. Examines how pilots, procedures, instruments, and representations together allow a cockpit to "remember" information that need not reside in any one memory. Read it as an analogy for a software engineering organization. Focus on the idea that cognition can be distributed across people and artifacts, then ask: what does an engineering organization know that no individual engineer needs to know? Full citation: Edwin Hutchins, "How a Cockpit Remembers Its Speeds," *Cognitive Science* 19, no. 3 (1995): 265–288.'
    - heading: Knowledge management in software engineering
      items:
        - '["Knowledge Management in Software Engineering."](https://doi.org/10.1109/MS.2002.1003450) Rus and Lindvall, 2002. Brings the knowledge-management problem directly into software engineering. Focus on why software organizations depend heavily on knowledge held by people and on the mechanisms by which engineering knowledge can be created, shared, and preserved. Compare its account of knowledge management with the broader idea in this lecture that engineering knowledge may also become part of models, tools, and the engineering environment. Full citation: Ioana Rus and Mikael Lindvall, "Knowledge Management in Software Engineering," *IEEE Software* 19, no. 3 (2002): 26–38.'
    - heading: People and representations
      items:
        - '["What''s Your Strategy for Managing Knowledge?"](https://hbr.org/1999/03/whats-your-strategy-for-managing-knowledge) Hansen, Nohria, and Tierney, 1999. Contrasts approaches centered on codifying knowledge with approaches centered on connecting the people who possess it. The specific management strategies matter less here than the underlying tradeoff. Ask which kinds of engineering knowledge benefit from explicit representation, which depend on human expertise and interaction, and why attempting to encode everything would be neither practical nor desirable. Full citation: Morten T. Hansen, Nitin Nohria, and Thomas Tierney, "What''s Your Strategy for Managing Knowledge?" *Harvard Business Review* 77, no. 2 (1999): 106–116.'
    - heading: Machine-readable knowledge
      items:
        - '["Knowledge Graphs."](https://doi.org/10.1145/3447772) Hogan et al., 2021. A survey of knowledge graphs as structured representations in which entities and their relationships are explicit and processable. Read the introductory material and selected sections on representation rather than attempting the entire survey. Focus on what becomes possible when relationships that would otherwise stay scattered across prose and artifacts become explicit. Then consider the contemporary engineering question: what changes when both humans and software agents need to recover and reason over engineering knowledge? Full citation: Aidan Hogan et al., "Knowledge Graphs," *ACM Computing Surveys* 54, no. 4 (2021), Article 71.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: Lecture slides — Engineering Knowledge (forthcoming)
---

**Premise.** *Software engineering depends on knowledge that must outlive the people, systems, and circumstances in which it was discovered. Engineering organizations therefore need ways to acquire consequential knowledge, preserve it beyond individual memory, and make it available to future engineering decisions.*

An engineering organization can know more than any person in it. Knowledge about a system may be distributed across engineers, users, documents, models, code, tests, tools, operational records, and the engineering environment itself. An engineer need not personally remember why every constraint exists if the organization can recover and apply the relevant knowledge when a decision requires it. Engineering knowledge, in this sense, is information about a system, its environment, or the decisions surrounding it that can support future engineering judgment.

For example, a production incident may reveal that an upstream service sometimes takes thirty seconds to respond. The incident ends and the engineers involved move on, but what the organization learned may remain consequential to future decisions about timeouts, retries, failure handling, and architecture. Whether that lesson persists, where it persists, and how much future engineers should trust it are knowledge-management decisions.

The challenge is therefore not to preserve everything, but to decide what deserves to persist. Information is expensive to record, organize, retrieve, interpret, and maintain. Some observations turn out not to matter; some knowledge can cheaply be rediscovered; some belongs primarily with people; and some is consequential enough that forgetting it would cause repeated work or repeated failures. The central engineering question is therefore: *What should an engineering organization remember, in what form, and with how much confidence?*

## Engineering organizations learn from many sources

Engineering knowledge does not originate only with engineers. Organizations learn from at least three broad sources.

- **Engineering work** produces knowledge about the system itself. Implementation exposes hidden dependencies; experiments reveal performance characteristics; prototypes test assumptions; design work uncovers constraints that were not apparent at a larger scale. Engineers also accumulate experience that helps them recognize recurring problems and plausible solutions.
- **The world around the system** supplies another kind of knowledge. Users and customers describe needs and failures. Domain experts explain environments the software must interact with. Contracts and regulations impose obligations. Changes in markets, organizations, technologies, and infrastructure can invalidate assumptions on which earlier engineering decisions depended.
- **Operation of the system** produces observations that were unavailable before deployment. Telemetry measures actual behavior. Support cases reveal unexpected uses. Security reports expose vulnerabilities. Incidents and near misses reveal combinations of conditions that engineers did not anticipate.

An incident is therefore not only something to repair; it is an opportunity to learn what the organization misunderstood. But observations do not automatically become engineering knowledge. A customer saying that a system is "too slow," a benchmark showing a latency increase, or an incident showing that a database timed out are observations. Engineers must determine what those observations mean, which explanations they support, how broadly the lesson generalizes, and whether it should affect future decisions. The acquisition of knowledge therefore has a basic structure:

Observation → interpretation → engineering consequence

Capturing the observation without interpreting it may preserve information without preserving much useful engineering knowledge.

## An organization can know more than its people

It is tempting to imagine engineering knowledge as the sum of what individual engineers know. Real engineering organizations work differently. A team may successfully operate a system even though no individual understands the entire system. One engineer knows why a particular interface exists. Another understands an important customer workflow. A test captures an edge case whose original author has left the organization. A deployment check prevents a configuration that nobody currently remembers caused an outage three years earlier.

Cognitive scientist Edwin Hutchins describes this phenomenon as distributed cognition. In his study of a commercial cockpit, remembering and reasoning are accomplished by a system comprising people, procedures, instruments, and representations; the relevant cognitive capability does not need to reside entirely inside any individual participant. Software engineering organizations exhibit the same property. Their capability is distributed across people and the artifacts and mechanisms with which those people work. Requirements, diagrams, tests, source code, issue trackers, decision records, dashboards, and automated checks can all participate in what the organization is capable of knowing and doing.

This changes the knowledge-management question. Engineers must ask not only who knows something, but where the engineering organization knows it. The answer may be a person, but it may instead be a document, model, test, procedure, tool, or relationship among several of these.

## Not everything should be remembered

Preserving knowledge has a cost. Engineers can document every meeting, retain every experiment, record every decision, and archive every intermediate artifact, yet leave future engineers less able to find what matters. The purpose of engineering memory is not to preserve everything. It is to reduce consequential rediscovery.

Whether knowledge deserves durable representation depends on what happens if it is lost. Knowledge is more valuable to preserve when forgetting it would have substantial consequences, when the same question is likely to recur, when rediscovery would be expensive, or when many future decisions may depend on it. Conversely, knowledge that is cheap to reconstruct or unlikely to matter again may reasonably remain informal or disappear. This is an engineering tradeoff because preservation itself consumes resources: representations must be created, discovered, interpreted, and sometimes revised, and the organization can spend more maintaining its memory than it saves by possessing it.

**Decision — should this knowledge persist?** Consider the consequences of forgetting it, the likelihood that the question will recur, the cost of rediscovery, the number of future decisions it may affect, and the cost of preserving and using it.

## Knowledge can persist in different forms

Knowledge need not become a document. It can persist in at least four forms:

- **Tacit** — carried primarily through the experience of individuals.
- **Social** — shared through conversation, review, mentorship, and recurring team practices.
- **Represented** — made explicit in prose, models, diagrams, decision records, requirements, tests, code, or structured data.
- **Operationalized** — built into the engineering environment through templates, generators, policies, static analyses, automated checks, or other mechanisms that cause future work to reflect what the organization learned.

These forms are not a maturity ladder. Tacit expertise can preserve nuance that would be expensive or impossible to represent fully. Conversation can be the cheapest way to resolve a one-time question. A document can preserve reasoning that would be obscured by automation. An automated control is valuable when a recurring consequential decision can reliably be made mechanical. The useful question is therefore not merely how to document knowledge, but what form the knowledge should take. A lesson may begin in one engineer's experience, become shared through conversation, be represented in a document or model, and eventually become a convention or automated control. Knowledge should move when the expected benefit of making it more durable, discoverable, precise, or operational exceeds the cost.

Explicit representation can itself vary in structure. Prose may be appropriate when context and rationale matter, while more structured representations can make particular relationships available for computation. A knowledge graph, for example, can represent entities and relationships explicitly: a component depends on a service; a requirement constrains an interface; a test supplies evidence for a claim; one decision supersedes another. Such representations make relationships available for traversal and computation rather than requiring engineers to reconstruct them repeatedly from prose.

Structured representations have acquired additional importance as software agents participate in engineering work. Humans often connect information spread across artifacts using experience and context; agents must recover many of the same relationships to act competently. Explicit relationships can help both humans and agents retrieve relevant context, follow dependencies, and determine which engineering knowledge bears on a task. A structured representation does not make the represented knowledge correct: representation gives knowledge form, not truth. The provenance and fidelity of the represented claims still determine what conclusions they can support.

## Representations are evidence, not reality

Software and its environment change continually, so a representation that accurately described a system when it was created may become progressively less faithful as the system evolves. That does not necessarily make the representation useless. An old architecture diagram may remain excellent evidence of the intended decomposition of the system, useful evidence about why certain interfaces exist, weaker evidence about current dependencies, and almost no evidence about whether the original workload assumptions still hold. This is a routine consequence of engineering a medium built for change, not merely a failure of documentation.

The important question is therefore not simply whether a representation is "current." Engineers must ask what claim they are trying to support with it and how much evidentiary weight the representation deserves for that claim. When using engineering knowledge, ask where it came from. Who produced it? When? From what observations? For what purpose? What did it actually claim? What assumptions did it depend on? What has changed since it was produced? What incentives or interests may have affected what was recorded? Most importantly, what claim are you asking it to support now? These questions do not produce a mechanical confidence score; they establish the context required for engineering judgment.

The authority engineers give a representation should therefore reflect its fidelity to current reality. Drift does not necessarily destroy knowledge; it changes what claims that knowledge can support.

## Engineering records are not neutral

Engineering representations are produced by people inside organizations. Those people possess incomplete information, interpret events differently, have different authority, and may face incentives that affect what gets measured, estimated, emphasized, or recorded. An estimate may become a budget commitment. A dashboard can emphasize one measure of project health while hiding another. A postmortem can foreground technical causes while paying less attention to organizational decisions. Meeting notes can transform a complicated discussion into the durable statement that "the team agreed," giving one participant's interpretation consequences long after the meeting itself has been forgotten. Representation gives such claims persistence. It does not give them truth.

This matters because engineering records can acquire audiences their authors never anticipated. Internal messages, estimates, meeting notes, design discussions, and incident records may eventually be read by executives, auditors, regulators, courts, journalists, or legislators. The lesson is not to avoid creating records or to disguise uncomfortable facts. It is the opposite: distinguish observation from interpretation, represent uncertainty honestly, preserve material disagreement, and attribute decisions accurately.

**Who records a decision influences what the organization later remembers about it. Treat that influence as an engineering responsibility.**

## Engineering knowledge has a lifecycle

Engineering knowledge is acquired, interpreted, represented, used, and eventually reconsidered. A production incident might reveal that an upstream service occasionally takes thirty seconds to respond. Engineers first observe the timeout pattern. They interpret it as evidence that an assumed latency bound is unsafe. They may represent the lesson in a dependency record and timeout policy. Future engineers then use that knowledge when designing calls to the service. If the dependency, workload, or service-level agreement later changes, they must reassess what the old evidence supports.

The example illustrates a recurring lifecycle:

Observe → Interpret → Represent → Use → Reassess

Reassessment does not simply mean "keep the documentation up to date." Historical knowledge can remain useful even after it ceases to describe the current system precisely; what changes is the authority it should carry for different decisions. Good engineering memory therefore requires both remembering and knowing what the organization should no longer treat as authoritative.

## Consequential knowledge should change engineering

An organization has not necessarily learned merely because somebody wrote down what happened. Repeated rediscovery is evidence about the organization's representation of knowledge. A fact that engineers continually reconstruct may need to become easier to find. An explanation repeated to every new team member may deserve durable representation. Repeated mistakes may indicate that documentation is too weak a form for the lesson being preserved. When incidents repeatedly expose the same assumption, the organization may need to change the engineering environment rather than remind engineers of the lesson again.

Consequential knowledge can therefore migrate into more durable engineering structure, and the appropriate destination depends on the future decisions it should affect. Some knowledge becomes a requirement because it describes what stakeholders need. Some becomes specification because acceptable behavior must be made precise. Some becomes architecture because future work should inherit a structural decision. Some becomes a design convention or shared mechanism. Some becomes a validation check because the organization needs continuing evidence for a claim.

Consequential learning should therefore sometimes change how future engineering is performed. An organization that repeatedly experiences the same surprise without changing what it remembers, represents, or does has collected experience without accumulating much engineering knowledge.
