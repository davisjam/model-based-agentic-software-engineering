### Uber

*Ride-hailing and logistics platform · a durable environment around a replaceable reasoner (economics motive)*

#### Verso — Evidence

**A shared kind, two motives.** Two organizations build the same durable environment around a replaceable reasoner and reach it from opposite motives. GitLab starts from trust: as code gets cheap, the scarce problem becomes trusting it, so GitLab wraps the model in a durable layer of context, verification, governance, identity, and provenance, kept independent of any one model or agent so the organization's controls persist as reasoners change.[cite: staples2026abundant] Uber starts from economics: with agents already writing most of its code, it treats the surrounding environment as an object of continuous measurement. Both keep the reasoner swappable and the environment permanent, and both stop at a knowledge-and-context graph rather than an executable model of behavior. Uber gives the fuller, independently measured account, so the deep treatment follows it.

**What the public record shows.** Uber describes AI tools operating throughout the software lifecycle: more than 70 percent of pull requests are attributed to local or cloud agents, engineers have created more than 3,600 agent skills, and those skills execute more than 30,000 times per day.[cite: medisetty2026factory] Managed agents perform code review, CI repair, end-to-end changes, alert triage, debugging, and maintenance. The interesting structure is not the volume of agent use but that Uber engineers the environment around the agents: real workloads become benchmarks; models are selected against cost, quality, and reliability; context and tool access are compiled down to reduce unnecessary reasoning; recurring workflows harden into reusable skills; and agents are evaluated in units such as cost per merged pull request, review, or alert.

**Boundary of the evidence.** The account is self-reported operational data, not a controlled comparison. It is strong on context, skills, routing, benchmarks, and cost, and much thinner on behavioral, process, or invariant models serving as the primary reasoning surface — its substrate is a knowledge-and-context graph, not an executable model of the software. GitLab's account is thinner still: a vendor architectural vision rather than a measured deployment.

**Portable lesson.** When code is abundant, the durable engineering object is the environment around the reasoner — the context it reads, the tools it may call, the cost it is measured against — not the reasoner itself.


#### Recto — MAGE Interpretation

<!-- label: field-guide-uber -->
<!-- figure: assets/field-guide-uber.svg | *Uber projected onto MAGE.* Public evidence strongly supports engineering the environment around a replaceable reasoner; the executable-model tier stays out of reach. -->

**MAGE reading.** Uber is strong evidence that the durable engineering object is the Governed Engineering Environment rather than the model. It engineers the reasoning horizon by compiling context and tools down to what a task needs, externalizes organizational knowledge into a queryable graph, and converts recurring workflows into reusable skills — engineering capital that outlives any one model.

**Interpretive boundary.** MAGE reads much of Uber interpretively. The reasoning-horizon and externalized-knowledge moves are directly supported, but the account stops at a knowledge graph, with no executable behavioral model as the reasoning surface. GitLab enters the same kind from the trust motive and is cited as the sibling, not developed separately.
