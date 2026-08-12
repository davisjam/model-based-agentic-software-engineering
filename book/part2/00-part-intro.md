<!-- part-foreshadows: modeling-thesis, mage-becomes-practical -->

Software engineering has always relied on abstraction. Large systems exceed what any engineer can
reason about directly, so we work through architectures, interfaces, schemas, requirements, state
machines, dependency graphs, and other purposeful reductions. Explicit models have nevertheless
remained secondary in much code-centric software practice because maintaining another representation of
a fast-moving system carries a standing cost. Commodity intelligence changes that economics. Deriving,
reconciling, regenerating, and querying structured representations are exactly the kinds of repeated
work a coding fleet can perform cheaply.

You may still be wondering why a book about coding agents has arrived at models. The answer is not that
agents invented software engineering's reasoning problem. Scale did that long ago. The change is that
implementation can now move much faster than the knowledge required to direct it. A human team can spend
substantial effort reconstructing architecture, ownership, policy, and lifecycle from code and
institutional memory; an agent fleet can spend that same effort over and over, once per task and once
per fresh reasoning state. MAGE uses models to stop repurchasing knowledge that can be made durable.

<!-- thesisbox -->
> ### MODELING THESIS
>
> Externalize engineering knowledge and intent into explicit, structured models that both engineers
> and agents can reason through.
>
> Richer representations make larger engineering questions tractable and expose richer surfaces for
> authority.

The progression begins modestly. Selected context becomes connected knowledge; connected knowledge
becomes a model when it carries semantics useful to an engineering question; richer models can state
properties, support analysis, and remain mechanically related to the system they represent. The
destination is not more documentation. It is an engineering surface through which people, agents, and
tools can reason about properties that would otherwise have to be reconstructed from lower-level detail.

<!-- point: part-2-asks-what-to-model-and-what-it-reveals | Part II asks one question of every system: what should I model, and what will the model let me know? | terms: thesis-modeling, model-as-map, scope-of-modeling -->
That surface does not build itself. Before an agent can reason over a model, an engineer has to decide
which model to build, and why — and a model is useful because it leaves things out.

A production system can hold millions of lines of code, hundreds of dependencies, dozens of services,
queues, databases, deployment configurations, policies, tests, and operating procedures. No engineer
reasons about all of it at once. The question decides which details matter.

Ask whether two workers can process the same job at once, and the color of the web interface does not
matter, nor the exact prompt that describes an image. You need to know who can own work, how ownership
is acquired, when it expires, and what happens after a crash. Ask instead whether one service can
bypass another, and those ownership details fall away; now you need components, communication edges,
authorization rules, and the seams a call must pass through. Ask whether the system is getting slower,
and you need another representation again — stages, clocks, budgets, and a model of how retry and
concurrency shape the worst case.

The system did not change. The engineering question did. This Part makes that one move, and repeats it
until it is a reflex:

> **Hold the system constant. Change the engineering question. Watch the model change.**

Put formally, that is the question this Part asks of every system, and asks again at every turn:

**What should I model, and what will the model let me know?**

The skill Part II teaches is not modeling as a pile of artifacts, but model **selection** — choosing the
representation that exposes the property you need to reason about, and no more.

DocAble is the running example — the production accessibility service this book is built on, first met
in Part I. A document enters, remediation is distributed across workers and services, the result is
validated, and a corrected document returns with a record of what changed. The real system is far more
complicated than the views ahead. That is the point: each view keeps only what its question needs.

The same object wears every hat. A single worker in that pipeline is several different things at once,
depending only on which question you bring to it — a phenomenon Part I walks in the concrete. Hold the
image: one object, five true pictures, and none of them *is* the worker.

<!-- point: part-2-moves-through-five-model-classes | Part II moves through five classes of model, not a taxonomy to memorize. | terms: model-zoo, four-plus-one-views -->
The models divide into five classes. The examples ahead fall into five classes that the rest of the
book will reuse:

- **Behavioral** — what states a thing occupies, and how it moves between them.
- **Structural** — what parts exist, and which may depend on which.
- **Decision** — who is permitted to do what, or to reach what.
- **Measurement** — what quantities the system promises to hold, and to what bound.
- **Documentation** — what explanation must stay true to what the code did.

Concurrency and ownership feel like a sixth class. They are not. Ownership is a *specialization*: lay an
owner and a lease over a behavioral machine, add the queue the owner claims from to the structural
picture, and you have it. The five classes are deliberately coarse. The point is to organize recurring
engineering questions, not to produce an exhaustive modeling taxonomy.

<!-- point: there-is-no-model-of-the-system-only-purposeful-reductions | There is no model of the system, only purposeful reductions that each answer one question. | terms: model-as-map, scope-of-modeling, map-and-territory -->
So there is no single "model of the system." There are only purposeful reductions of it, each built to
answer one engineering question and expose one property. A model earns its place by the question it
settles, not by how much of the system it draws.

These classes are not a checklist. A small system may need two; a safety-critical one may need many
models within a single class. The question is never *have I drawn all five?* It is: *what do I need to
know about this system, and what is the smallest representation that lets me know it?*

A word on honesty of scale. The production structural model carries roughly a hundred and twenty
components; you will see seven boxes and one forbidden edge. The production behavioral model composes
nine state machines; you will see one job lifecycle. This is not tidying the picture for print. **A
model leaves things out because leaving things out is what makes the relevant property visible.** The
reduction *is* the thesis, demonstrated — say it to yourself each time the real thing dwarfs the drawing.

> #### Four questions, once per model
>
> Every model section ahead opens on the same four lines:
>
> - **Engineering question** — what am I trying to know or decide?
> - **Model** — what representation makes that question cheap to answer?
> - **Property** — what can I now state precisely?
> - **Quality attribute** — what engineering concern does that property serve?
>
> The lines are the rhythm, not a form to fill. The prose flows over them; it does not announce them.

Part III adds a fifth question: **what gives the property authority?** Some obligations can already be
held without an explicit system model — a sandbox can deny an action, a compiler can reject a construct,
a test can block a regression. The models in this Part enlarge that surface. Once architecture,
ownership, behavior, policy, or measurement is explicit, the environment can reason about obligations
that would otherwise require an agent or a human to reconstruct the missing semantics. Part II builds
those representations. Part III develops the general machinery of authority.

<!-- point: part-2-hands-you-a-reusable-mental-toolbox | By the Part's end you hold a mental toolbox you can rebuild for your own system. | terms: model-zoo, scope-of-modeling, thesis-modeling -->
Work through these with DocAble held constant while the question varies, and by the Part's end you
should hold a small mental toolbox: for each concern, the model that answers it, the property it lets
you state, and the quality it serves. You come into this Part able to say *why* models matter; you leave
it able to *choose one*. That toolbox arrives as a single table at the Part's close, in
[Joining Models Around a Scenario](2.8-joining-models-around-a-scenario.html). The test of this Part is not
whether you can recite DocAble's models. It is whether you could build the matching ones for a system of
your own.
