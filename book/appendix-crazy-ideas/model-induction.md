Explicit models need not always precede realization. Repeated structure in realized work may supply evidence from which useful engineering concepts can be induced. The central move is not clustering for its own sake. Weak detectors or retrieval surface candidate regularities; comparison establishes whether instances share more than superficial form; engineering judgment decides whether the recurring shape denotes a concept worth naming; and the resulting vocabulary becomes available to future reasoning.

DocAble supplies a grounded software instance. Primitive-density analysis exposed repeated low-level structures. Most were legitimate implementation detail. Some recurring patterns across related components expressed concepts the system was using without naming, and those concepts became explicit types and relations.

The broader conjecture is that the same move may recur outside software. Repeated entities and relations in documents or organizational records may expose latent domain vocabularies. Repeated geometric arrangements, interfaces, and parameter bundles in CAD artifacts may expose candidate components or design concepts. In each case, realized artifacts supply candidate structure, but they do not decide which distinctions matter.

This suggests a research problem distinct from ordinary retrieval: when can an agent move from retrieving repeated instances to proposing a durable abstraction that makes future work cheaper to reason about? Useful evaluation would have to measure not merely whether an induced concept matches a latent cluster, but whether adopting the abstraction improves later reasoning, consistency, search, assurance, or reuse.

The research problem therefore has at least three separable stages. Detection asks whether realized artifacts contain recurring structure worth comparing. Abstraction asks whether several instances can be explained by a common concept rather than merely grouped by surface similarity. Adoption asks whether naming and institutionalizing that concept improves later engineering work. A system can succeed at one stage and fail at the next: a perfect cluster can still correspond to an accidental implementation convention, and a semantically valid abstraction can still cost more to maintain than it saves.

This makes model induction different from ordinary concept mining. The output is not merely a label or cluster. The induced concept may acquire fields, relations, invariants, ownership, correspondence rules, or authority. Once future work begins depending on it, the abstraction becomes part of the engineering environment and incurs the same obligations as any other model: it can drift, overfit its originating examples, suppress useful variation, or survive after the concept has ceased to matter.

The central evaluation question is downstream utility. Given the same future tasks, does an induced representation reduce reconstruction, inconsistency, or repeated judgment? Does it improve retrieval because related instances join through a shared concept? Does it permit checks or transformations that were impractical over raw artifacts? Can engineers predict which changes will be affected by modifying the model? And does the benefit persist long enough to repay the cost of establishing and maintaining the abstraction?

Brownfield evolution provides a particularly useful experimental setting. Mine candidate concepts from an initial history, introduce selected representations, and then evaluate later work prospectively rather than scoring the induced abstraction against the same artifacts from which it was inferred. That design distinguishes an abstraction that merely compresses yesterday's implementation from one that actually improves tomorrow's engineering.

Human judgment is not merely a fallback stage in this process; it supplies the intent test that repetition cannot. Two structures may recur because of copy-and-paste history, framework convention, or coincidence rather than because the domain contains a stable concept. Conversely, a consequential concept may have several superficially different realizations. The useful agentic system therefore needs to propose and compare candidate abstractions while exposing the evidence from which each was inferred, leaving adoption to accountable engineering judgment until stronger criteria are available.

**Candidate research questions.**

* Which forms of repetition predict a reusable engineering abstraction rather than accidental implementation similarity?
* How should agents propose relations, invariants, and boundaries once a candidate concept has been identified?
* What evidence should accompany an induced abstraction so an engineer can judge whether it deserves adoption?
* How can induced models be evaluated prospectively on later work rather than retrospectively against their training artifacts?
* When does introducing a model reduce degrees of freedom productively, and when does it prematurely freeze an ontology?
* How should an induced model evolve, split, merge, or retire as realized work changes?

[ref:model-induction-general] traces that general move, from realized work to a named model, and instantiates it three ways. Its software, knowledge-work, and mechanical-CAD columns are what make this a research direction rather than a claim the book establishes.

<!-- label: model-induction-general -->
<!-- figure: assets/model-induction-general.svg | *Model induction.* The same move runs in three settings: realized work yields repeated low-level forms, weak detection surfaces candidate regularities, and engineering judgment names the concept that survives comparison. The left rail states the move; the three columns instantiate it in software, knowledge work, and CAD. Software is the grounded case; the extension to knowledge work and CAD is a generalization, not evidence DocAble supplied. -->

**Possible paper seed:** *From Repetition to Representation: Inducing Engineering Models From Realized Work.*
