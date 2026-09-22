---
title: Modeling
sessions:
  - "Modeling: Representation & Implementation"
  - "Modeling: Engineering with Models"
readings:
  groups:
    - heading: The modeling principle
      items:
        - cite: davis2026mage
          locator: '§2.1 and §2.8'
          annotation: '{mage:2.1} and {mage:2.8} Davis, 2026. The spine of the unit. The first chapter develops the modeling principle this unit applies: externalize selected engineering knowledge and intent into representations suited to the questions engineers and agents must answer. Pay particular attention to how a useful model is selected, what information it preserves, and how traceability and drift connect a model to the territory it describes. The second chapter treats what happens when models accumulate: shared identities, joins, and the system of models rather than any single one. The catalogue of model kinds between them belongs to the lectures.'
    - heading: The size of the modeling repertoire
      items:
        - cite: visualparadigm-uml-guide
          annotation: '["The Complete Guide to UML Diagram Types."](readings/visual-paradigm-uml-diagram-types.pdf) UML is deliberately enormous: its fourteen standard diagram types provide different representations of system structure and behavior. Do not attempt to memorize this catalogue; browse all of it. For each type, ask what information it preserves, what it leaves out, and what engineering question would make that reduction useful. The point of the reading is to see the size of the established modeling repertoire before we practice selecting from it. (Source: [visual-paradigm.com/guide](https://www.visual-paradigm.com/guide/the-complete-guide-to-uml-diagrams-all-14-types-explained-with-practical-examples).)'
    - heading: 'Models as engineering artifacts: the MBSE tradition'
      items:
        - cite: madni2018mbse
          annotation: 'Madni and Sievers, ["Model-Based Systems Engineering: Motivation, Current Status, and Research Opportunities"](https://doi.org/10.1002/sys.21438) (2018). Places our use of models in the much older tradition of model-based systems engineering, which treats models not as illustrations but as engineering artifacts used across specification, design, analysis, verification, and configuration management. Look past the particular MBSE technologies and ask a more general question as you read: what becomes possible when important engineering knowledge has explicit structure rather than remaining distributed across documents, implementations, and people''s heads?'
    - heading: Delegation as an information problem
      items:
        - cite: aghion1997authority
          annotation: 'Aghion and Tirole, ["Formal and Real Authority in Organizations"](https://doi.org/10.1086/262063) (1997), selected sections. This is not a software-engineering paper, and its agents are people. That is precisely why we read it. Aghion and Tirole distinguish the formal right to make a decision from effective control over the decision, and show that delegation, information, initiative, and control are intertwined. Read it as a theory of the problem created whenever one actor delegates consequential work to another: what must the delegate know, what freedom should they receive, and what control must the principal retain?'
  optional:
    - 'Estefan, "Survey of Model-Based Systems Engineering (MBSE) Methodologies" (INCOSE, 2008). The historical foundation of MBSE: a survey of the early methodologies, distinguishing methodology, process, method, and lifecycle model.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: ready
materials:
  - title: Lecture 1 slides — Asking Questions with Models (forthcoming)
  - title: Lecture 2 slides — Engineering with Models (forthcoming)
---

**Premise.** *A model is useful because it leaves things out.*

Earlier, we defined engineering as the discipline of exercising informed control over consequential systems. Informed control requires more than possessing an implementation. An engineer must be able to understand the properties relevant to a decision without reconstructing the entire system every time the question changes.

A dependency graph discards most of the program so that relationships among components become easy to inspect. A state machine ignores most implementation detail so that legal transitions become explicit. A resource model suppresses behavior so that cost, latency, or capacity can be analyzed. The reduction is useful precisely because it is incomplete.

Modeling therefore supports informed control by preserving the distinctions needed for an engineering question while deliberately leaving unrelated degrees of freedom unspecified. The objective is not to reproduce the system in another notation. It is to construct a system of representations in which important engineering questions become cheap to answer.

## Two lectures, three activities

An engineering question drives every model: **select** what must be preserved to answer it, **represent** the selection so that people or machines can analyze it, and, when a question crosses models, **join** several reductions into an answer no single model contains. SELECT → REPRESENT → JOIN. The unit spans two lectures because these activities divide into two kinds of engineering work:

- **Lecture 1 — Asking Questions with Models** begins with engineering questions: how different questions motivate different kinds of models, the design space of reduction that UML, systems modeling, and other engineering traditions provide, and the distinction between a model and the representation that expresses it.
- **Lecture 2 — Engineering with Models** treats models as maintained engineering artifacts. Models have semantics, identities, dependencies, and correspondence with the territory they describe; they can duplicate knowledge, disagree, go stale, and be joined to answer questions that no single model answers alone.

## Questions come first

Consider a software system and some questions an engineer might ask of it:

- *Which components may depend on this service?*
- *Can this workflow reach an illegal state?*
- *Which operations lie on the latency-critical path?*
- *Where is customer data permitted to flow?*
- *Who is responsible when this component fails?*

There is no reason to expect one representation to answer all of these questions well. A component graph makes dependencies obvious while saying almost nothing about legal runtime behavior. A state machine exposes that behavior while omitting deployment. A deployment model locates software without explaining who owns it. The first modeling decision is therefore not *which notation should I use?* It is *what question am I trying to answer?* Only then can we ask what information must survive the reduction.

The repertoire to select from is large, because engineers ask a large variety of questions. UML alone provides fourteen diagram types across structure, behavior, interaction, and deployment. Model-based systems engineering broadens the space further: requirements, interfaces, logical and physical structure, parameters, and allocations can all be represented explicitly. Engineers also routinely use models that are never called UML: dependency graphs, schemas, ownership maps, cost models. The catalogue demonstrates something more important than any entry in it. There is no universal model of a software system; selecting among models is itself an engineering decision.

## Reducing a system for a question

Suppose an implementation contains:

```python
def submit_order(order, payment):
    trace.info("submitting order", order_id=order.id)
    authorization = payment.authorize(order.total())
    if not authorization.approved:
        trace.warning("payment declined", order_id=order.id)
        return DECLINED
    persist_authorization(order.id, authorization)
    mark_order_paid(order.id)
    return PAID
```

and our engineering question is: *can an order become PAID without successful payment authorization?* We might reduce the implementation to a two-transition state model:

```text
          authorize [approved]
UNPAID ─────────────────────────▶ PAID
   │
   │      authorize [declined]
   └────────────────────────────▶ DECLINED
```

A great deal disappeared. The helper functions, the exact control flow, the tracing statements, and the local names are gone. The authorization outcome and the legal transitions remain, because they are pertinent to the question. That loss is the point: the omitted details have not been declared unimportant, only irrelevant to this model's question.

Ask a different question of the same code and the reduction changes. If operators must be able to reconstruct the outcome of every attempted payment from telemetry, the tracing behavior suddenly matters, and we might build an observability model relating payment attempts, outcomes, and required telemetry events. The variable name `authorization` may appear in neither model. It remains a realization choice, and when realization is delegated to an agent, not every delegated choice needs to return as a model. Engineering models preserve the properties we must reason about; they do not duplicate the implementation at a different level of notation.

## A model is not its representation

The state model above is drawn as a diagram, but the same transition relation can be written as a table:

| From | Condition | To |
|---|---|---|
| UNPAID | authorization approved | PAID |
| UNPAID | authorization declined | DECLINED |

or as executable declarations:

```python
ALLOWED = {
    (UNPAID, APPROVED): PAID,
    (UNPAID, DECLINED): DECLINED,
}
```

or as structured configuration data, or only indirectly in ordinary program logic. The forms differ in syntax, audience, analyzability, and distance from the implementation, yet they preserve substantially the same transition relation. We therefore distinguish two terms:

- **Model** — a purposeful reduction of some territory that preserves selected properties or relationships for answering engineering questions.
- **Representation** — a concrete form in which a model is expressed so that humans or machines can inspect, manipulate, analyze, or consume it.

A diagram is a representation, not a synonym for a model. The distinction also lets us state properties over models: we might require that PAID is reachable only following successful authorization, an invariant over the modeled system. For now, our concern is whether the model makes such a property expressible and answerable. Whether an engineering environment should make the obligation consequential, by evaluating or enforcing it, is a separate question that Alignment takes up.

## Models are engineered artifacts

Lecture 2 begins where the first lecture's models start to accumulate. Once models become useful engineering artifacts, familiar software-engineering concerns return: elements need meaning and identity, knowledge gets duplicated, artifacts disagree with each other and with the territory, and representations are transformed, analyzed, and composed. In this sense, engineering with models resembles programming. Schemas and metamodels constrain interpretation the way types do. Model elements require stable identities the way names establish identity. Models separate engineering questions the way modules separate concerns. The DRY principle warns about duplicated knowledge in both. Tests check claims about programs; analyses and parity checks check the claims models make. None of this makes models programs. Both are engineered representations, and many of the disciplines that make programs dependable also make systems of models dependable. Four of those disciplines organize the lecture.

**Semantics matter.** Consider the simplest architectural diagram: an arrow from A to B. Perhaps A may call B. Perhaps A was observed calling B, depends on B at build time, sends customer data to B, must be deployed before B, or is owned by the team that owns B. The geometry does not say. A useful model needs elements and relations with semantics clear enough for the questions we intend to ask; notations, schemas, metamodels, and conventions are mechanisms for making those semantics less dependent on human guesswork.

**Models must correspond to something.** A model makes claims about a territory: an implementation, a deployed system, an organization, an intended design, or another model. The useful question is rarely whether "the model matches the code." It is which claim corresponds to which territory, and how that correspondence is established: an allowed-dependency claim checked against source dependencies by static extraction, a transition claim against runtime behavior, a deployment claim against manifests, an ownership claim against the service catalogue. A model is not stale merely because it is old. It becomes a problem when a correspondence the question needs no longer holds. Correspondence also runs in different directions. Some models are authored to express intent, some are derived from implementation, and some are observed from runtime behavior; comparing them answers a question of its own — where does realization differ from intent?

**Do not repeat yourself.** Suppose dependency, deployment, resource, and ownership models all refer to PaymentService, and each independently records its owner. Changing ownership now requires updating four artifacts correctly: the maintenance problem DRY names in programs, reproduced across models. The concern is independent authority, not physical uniqueness. Generated projections, caches, diagrams, and agent-facing views may duplicate bytes freely. Do not independently maintain the same engineering fact in several models; represent it authoritatively, preserve stable identities, and join it where needed.

**Join models to ask larger questions.** Purposeful reductions discard information, so important questions sometimes cross model boundaries. A dependency model tells us which services lie downstream of PaymentService; a deployment model, where they run; an ownership model, who is responsible; a resource model, their measured latency. Joined through stable identities, they answer a question none of them contains: which customer-facing paths depend on the slow service, where do the affected components run, and who owns them? Keep models small enough to serve their questions, and connect them through stable semantics and identities when a larger question requires several reductions. Call this composition without collapse. One enormous model of everything would recreate exactly the complexity modeling exists to reduce.

## From Modeling to Alignment

Models let engineers state what they intend, describe what they observe, preserve knowledge, and answer questions without repeatedly reconstructing the entire system. They also make engineering knowledge available to agents. A dependency graph exposes structure an agent would otherwise infer from thousands of source lines; a state machine exposes lifecycle constraints that are difficult to reconstruct from distributed implementation logic. Modeling reduces the reasoning required from humans and machines alike.

But a model does not become authoritative merely because it exists. A state machine can state that authorization must precede PAID. A dependency model can prohibit an edge; a resource model can bound a latency. Modeling makes such properties legible. The next question is different: what should happen when realization disagrees with the model? Should the discrepancy inform an engineer, produce evidence for review, fail a test, reject a change, or make the prohibited action impossible? Those are questions of Alignment. Modeling determines what we preserve and what we can ask. Alignment determines when consequential engineering knowledge should govern what can happen.
