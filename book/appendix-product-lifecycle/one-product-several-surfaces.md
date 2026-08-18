[ref:fig-h-lifecycle] The lifecycle view sets the product amid the engineering activities that shape it.

<!-- label: fig-h-lifecycle -->
<!-- figure: assets/h1-product-lifecycle.svg | *MAGE across the product lifecycle.* A software product is shaped through recurring engineering activities that ask different questions and therefore benefit from different purposeful representations. The horizontal sequence shows a dominant lifecycle flow, not a waterfall: operational experience, maintenance, assurance, and new product knowledge continually feed earlier activities. Assurance and compliance span the lifecycle because their obligations and evidence can originate in, constrain, and draw upon every other surface. MAGE can be applied to any surface independently. -->

The decomposition matters because there is no single MAGE model of a product. A model is a purposeful reduction. The representation appropriate to deciding whether customers need a capability should not contain the same information as the representation used to establish whether two workers can simultaneously own a job. Nor should an incident timeline be forced into the form of an architectural model merely because both concern the same system.

The representations also have different lifetimes:

episode-scoped → change-scoped → system-lived → organizational

An experiment may be episode-scoped. A ticket may govern one change. An architectural boundary may survive hundreds of changes. A regulatory policy may govern several products.

Age alone therefore does not establish model drift. A ticket written in 2022 need not describe the product in 2026 to remain a faithful representation of the intent governing a 2022 change. The relevant question is the correspondence the representation claims. MAGE rejects “keep the model equal to the code” as a universal synchronization rule because different models claim different relations to the realized system.

The surfaces also differ in authority. A discovery hypothesis may deserve representation without deserving enforcement. An accepted security invariant may deserve both. Modeling makes knowledge available for reasoning; Alignment determines what authority selected obligations receive.

Finally, the surfaces differ in what should remain reasoning. Some engineering work is fundamentally semantic and situational. Other judgments recur until they can be expressed as deterministic procedures or predicates. MAGE does not seek to maximize either agent use or deterministic machinery. It seeks an economical allocation of engineering knowledge between representations, autonomous reasoning, and mechanisms.

[ref:table-h1-config] summarizes these differences.

<!-- label: table-h1-config -->
<!-- table: *Characteristic MAGE configurations across the product lifecycle.* Each surface poses a different reasoning problem, so each naturally produces a different portfolio of models, a different Alignment posture, and a different determinization opportunity. The table is descriptive, not normative. [short: Characteristic MAGE configurations across the product lifecycle] -->
<!-- table-landscape -->
| Surface | Characteristic knowledge | Model portfolio | Alignment posture | Agentic reasoning earns its keep in | Determinization opportunity |
|---|---|---|---|---|---|
| **Product Discovery** | intent, hypotheses, evidence, tradeoffs | needs, hypotheses, experiment results, decisions, provisional requirements | mostly advisory; provenance and promotion of accepted decisions | synthesis, ambiguity, competing evidence, semantic judgment | low while questions remain genuinely unsettled |
| **Engineering & Realization** | system semantics, structure, behavior, obligations | architecture, state machines, contracts, dependency/knowledge graphs, quantitative models, invariants | tests, analyses, validators, model checking, constraints, gates | realizing changes across interacting semantic constraints | high where models make stable properties decidable |
| **Product Mgmt & Maintenance** | change intent, rationale, acceptance, history | tickets, issues, decisions, acceptance criteria, links to persistent models | workflow controls, acceptance checks, regression gates | interpreting change intent against the current system | recurring classes of change and acceptance |
| **Operations & Incidents** | current state, procedure, symptoms, causal history | topology, configuration, telemetry schemas, SLOs, runbooks, incident timelines, RCAs | permissions, monitors, health checks, rollout/rollback gates, automated procedures | diagnosis, novel situations, choosing or composing procedures | especially high for stable runbooks and recurring responses |
| **Assurance & Compliance** | obligations, claims, risks, evidence | requirements, policies, threats/hazards, traceability, assurance cases, evidence models | validators, proofs/checkers, evidence gates, approvals | interpreting semantic obligations and evaluating adequacy of evidence | high for decidable claims; bounded by semantic and normative judgment |

The table is descriptive, not normative. A particular organization may have a highly formal discovery process or an operations environment requiring substantial semantic diagnosis. The point is that MAGE is parameterized by the reasoning problem. Different surfaces naturally produce different portfolios of models and machinery.
