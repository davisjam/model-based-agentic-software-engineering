<!-- part-foreshadows: modeling-principle, mage-becomes-practical -->

Software engineering has always relied on abstraction. Large systems exceed what any engineer can
reason about directly, so we work through architectures, interfaces, schemas, requirements, state
machines, dependency graphs, and other purposeful reductions. Explicit models have nevertheless
remained secondary in much code-centric software practice because keeping another representation
synchronized with a fast-moving system costs work. Commodity intelligence changes that economics. Deriving,
reconciling, regenerating, and querying structured representations are repeated tasks an agent fleet
can often perform cheaply.

Agents did not create
software engineering's reasoning problem. Scale did. The change is that
implementation can now move much faster than engineers can direct it. A human team may reconstruct
architecture, ownership, policy, and lifecycle once. An agent fleet may reconstruct them again for every
task and fresh reasoning state. MAGE uses models to make reusable engineering knowledge durable by
preserving the relationships relevant to a question and suppressing the rest.

This also begins the answer to the probabilistic problem from Part I. A reasoner asked to recover a
consequential relation from raw implementation must infer it. A representation can make the relation
explicit. That does not guarantee the system respects the relation. But it changes the question from
*can the agent reconstruct this correctly?* to *can we state, analyze, or check this property directly?*
A better representation can therefore improve a consequential
judgment while also reducing how much reasoning and repeated reconstruction must be purchased to reach it.

<!-- principlebox -->
<!-- box-family: canonical -->
> ### Modeling principle
>
> Externalize engineering knowledge and intent into explicit, structured models that both engineers
> and agents can reason through.
>
> Appropriate representations make broader engineering questions tractable and make additional properties
> available for Alignment.

<!-- point: part-2-asks-what-to-model-and-what-it-reveals | Part II asks one question of every system: what should I model, and what will the model let me know? | terms: modeling-principle, model-as-map, scope-of-modeling -->
Before an agent can reason through a model, an engineer must decide what question deserves a model and which reduction will answer it.

A production system can hold millions of lines of code, hundreds of dependencies, dozens of services,
queues, databases, deployment configurations, policies, tests, and operating procedures. No engineer
reasons about all of it at once. The question decides which details matter.

The recurring question is:

**What should I model, and what will the model let me know?**

Part II teaches model **selection**: choosing the representation that exposes the property you need to
reason about, and no more.

DocAble is the running example — the production accessibility service this book is built on, first met
in Part I. A document enters, remediation is distributed across workers and services, the result is
validated, and a corrected document returns with a record of what changed. The real system is far more
complicated than the views ahead. Each view keeps only what its question needs.

The same system element can appear differently in several models. A worker may be a component, an actor
in a lifecycle, an owner of work, or a measured resource, depending on the engineering question. None of
those representations is the worker itself.

<!-- point: part-2-moves-through-five-model-classes | Part II moves through six classes of model, not a taxonomy to memorize. | terms: model-zoo, model-classes -->
The examples ahead fall into six broad classes that the rest of the book will reuse:

- **Structural** — what parts exist, and which may depend on which.
- **Behavioral** — what states a thing occupies, and how it moves between them.
- **Ownership** — who controls a unit of work, and for how long.
- **Decision** — what is allowed, or which alternative should be selected.
- **Measurement** — what quantities the system holds, and against what bound.
- **Provenance** — what happened to an artifact, and what evidence records it.

<!-- point: there-is-no-model-of-the-system-only-purposeful-reductions | There is no model of the system, only purposeful reductions that each answer one question. | terms: model-as-map, scope-of-modeling, map-and-territory -->
These six classes organize recurring engineering questions rather than partitioning systems. They
overlap, and they are not exhaustive. There is no single "model of the system": each model is a
purposeful reduction chosen for a question.

<!-- point: each-family-chapter-runs-canonical-move-then-docable-specialization | Each family chapter runs the same progression — the canonical engineering move outside DocAble, then how DocAble specializes it — so the reader recognizes an established representation before meeting its production instance. | terms: model-classes -->
Each of the six chapters ahead runs the same progression: the canonical engineering move as software
engineering already knows it — the representation, the properties it makes expressible, the analyses it
supports — and then how DocAble specializes that move in the running system. The aim is to recognize an
established representation first, and meet its production instance second.

<!-- point: keep-property-invariant-analysis-and-authority-distinct | A property is a claim expressible over a model; an invariant a property required to hold over a declared domain; an analysis a method producing evidence about a property; authority the consequence attached to that evidence — Part II owns the first three, Part III owns authority. | terms: modeling-principle, alignment-principle -->
Four terms stay distinct through the Part. A **property** is a claim that can be expressed over a model.
An **invariant** is a property required to hold over a declared domain. An **analysis** or check produces
evidence about a property. Whether that evidence gets to constrain an action or block a consequence is a
separate question of **authority**, and it belongs to Part III.

<!-- box-family: inset -->
> #### Four questions for every model
>
> Every model section ahead opens on the same four lines:
>
> - **Engineering question** — what am I trying to know or decide?
> - **Model** — what representation makes the question tractable?
> - **Property** — what can I now state precisely?
> - **Quality attribute** — what engineering concern does that property serve?

Part III adds a fifth question: **what gives the property authority?** Modeling makes properties
explicit; Alignment gives selected properties consequence.

<!-- point: part-2-hands-you-a-reusable-mental-toolbox | By the Part's end you hold a mental toolbox you can rebuild for your own system. | terms: model-zoo, scope-of-modeling, modeling-principle -->
The recurring pattern is: identify the concern, choose the model that exposes it, state the property, and
connect it to the quality attribute it serves. The final chapter,
[System Knowledge](2.8-system-knowledge.html), shows how the six models connect without becoming a seventh
model. By the end, you should be able to choose useful representations for a system of your own.
