<!-- GENERATED from book/latex/sources/appendix-practicing-mage/brownfield-migration.tex; edit the LaTeX source, then run tools/mage_latex.py sync. -->

An existing system already contains engineering knowledge and controls in its tests, configuration, documentation, permissions, and operating procedures. Brownfield adoption begins by identifying which of these a selected kind of work depends upon, then determining what must be recovered, reconciled, or enforced. The objective is not comprehensive modeling or universal enforcement, but dependable support for the work being delegated.

Model coverage and enforcement are separate questions. A system may have extensive documentation with little effective enforcement, or strong tests and permissions with few explicit system models. [ref:recovering-and-extending-governance] recalls the recovery and alignment techniques developed in {{chapter:one-problem-many-models}}, including [{{sec:brownfield-engineering}}](4.3-brownfield-engineering.html); [ref:practicing-brownfield-exits] organizes their application into four stages with exit criteria.

<!-- label: recovering-and-extending-governance -->
<!-- figure: assets/recovering-and-extending-governance.svg | *Recovering and extending governance in an existing system.* (a) Recover useful models from implementation patterns and existing engineering knowledge (adapted from [ref:discovering-latent-models]). (b) Establish correspondence through active alignment, then preserve it through passive alignment (adapted from [ref:active-passive-alignment]). (c) Extend the alignment kernel incrementally, protecting established obligations as new models enter governance (adapted from [ref:alignment-kernel]). [short: Recovering and extending governance] -->

### Audit, Synchronize, Govern, Extend {#audit-synchronize-govern-extend}

Apply the four stages in [ref:practicing-brownfield-exits] to one surface at a time. Their exit criteria describe what must become dependable before the next investment can rely on it. They are not dates in a rollout plan. A new discrepancy can send one obligation back to reconciliation while other parts of the environment continue to operate.

Agents can perform much of this work. They can inventory existing representations, recover candidate models from source and configuration, construct traceability links, and compare models with their implementations, using the techniques in [ref:4.3-brownfield-engineering:heading:recover-latent-models]. This can make brownfield migration substantially less expensive than manual reconstruction. The resulting models still need validation: an agent may misunderstand the architecture or faithfully recover a defect as though it were intended behavior. Engineers should review consequential claims and unresolved discrepancies. Where model–implementation correspondence can be checked independently through reliable analyses or tests, that evidence can reduce the need for manual review. Agreement establishes correspondence within the checks’ scope, however, not that the recovered model expresses the intended design.

<!-- label: practicing-brownfield-exits -->
<!-- table: The brownfield migration path. Advance when the selected surface meets its exit criterion. [short: Brownfield migration exit criteria] -->
| **Stage** | **Work** | **Exit criterion** |
|---|---|---|
| Audit | Inventory claims, their subjects, and existing mechanisms; classify gaps. | Claims needed for the selected work have been checked; consequential discrepancies have an owner and a next action. |
| Synchronize | Reconcile the representations that upcoming work will rely upon. | Required correspondences are established through review or independently checked evidence. |
| Govern | Enforce selected obligations where sufficient evidence is available. | The selected obligations no longer depend primarily on someone remembering to inspect them. |
| Extend | Add capability where expected reuse or consequence justifies its cost. | Each addition has a named consumer or engineering question and a reason to exist. |

**Audit.** Trace the claims needed for the selected work to their subjects and consumers, and identify which discrepancies require attention. A wiki may declare that only one service can call an external API; inspect the implementation, deployment policy, and any check that relies on that declaration. Record whether the claim describes current behavior or intended behavior. A disagreement does not tell you which side should change. Keep the audit advisory while those decisions remain unresolved; making a recovered mistake authoritative would make the system harder to repair.

Classify unlinked code before treating it as a modeling backlog. An orphan can have three explanations:

- **Missing representation.** A consequential subsystem or relation has no useful account. Propose a representation around the question that work repeatedly needs to answer.
- **Missing anchor.** The representation exists, but code, tests, or work records do not lead to it. Repair the link rather than creating a competing account.
- **Below the grain.** The implementation is too fine-grained or generic to warrant a separate representation, such as a typed-ID alias or configuration loader. Record the exclusion where coverage reports need to distinguish it from a gap.

An orphan count without this triage rewards unnecessary modeling. Follow the important questions instead. If a model identifies a component, it need not enumerate every helper used to implement it. Conversely, a small piece of code may deserve explicit treatment if it determines a consequential permission or transition. Size alone does not decide the appropriate grain.

**Synchronize.** Resolve the selected discrepancies and establish dependable correspondence before upcoming work relies on the representation. Link the claim to the code and evidence that support it; provide the reverse route where engineers or agents need to discover the claim from an implementation location. Repair stale anchors and surface semantic disagreements for an engineering decision. When a machine can derive the needed view from the authoritative source, avoid maintaining a second handwritten version.

An existing configuration can remain authoritative while a recovered model is checked against it. DocAble’s service-dependency arrangement illustrates this intermediate state: correspondence checks compare the model-derived view with the authoritative deployment configuration. Transferring authority requires a separate decision, consumer migration to the new representation, and retirement of the duplicated declaration, as [ref:chapter:appendix-a-model-driven-deployment] explains. This permits reconciliation without treating a newly recovered model as authoritative on its first day.

Existing documentation need not be replaced by a new modeling tool. A wiki may remain the entry point when engineers can reliably locate the relevant claims and determine whether they still describe the system. Links to code and tests help establish correspondence, while selected automated comparisons can detect drift. A valid link, however, does not establish that the claim at its destination is correct.

**Govern.** Choose which selected obligations should constrain an action or block a transition. Place enforcement at the earliest boundary with the necessary semantics and evidence. Some properties can be enforced directly by a type, permission, or local check; others depend on the representations just reconciled. Exercise the rejection path as well as a successful case, and examine whether an alternative route bypasses the mechanism. A check that emits the correct finding but permits the prohibited action has not completed this work.

Name the response to missing or stale evidence. Depending on the obligation, the environment may wait, reject the work, or require an explicit engineering decision. An override should record the affected obligation, the available evidence, the person accepting the exception, and its scope. A temporary exception should not silently become the policy for later changes.

**Extend.** Use observed friction and recurring failures to choose the next investment. Better retrieval may be enough; a new model, stronger evaluator, generator, or gate should answer a question that current machinery cannot settle economically. Record both its consumer and its maintenance obligation. The result is an area of the system where engineers can delegate work with adequate knowledge of the intended behavior and evidence for acceptance. Other parts of the system may remain outside that governed scope.
