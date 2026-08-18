**Engineering question.** What change are we asking for, and why?

Many software organizations already possess a lightweight modeling substrate without calling it one: the ticketing system.

A good ticket is more than an instruction to modify source code. It can identify desired behavior, rationale, acceptance criteria, affected concepts, constraints, related changes, and prior decisions. Tickets link to one another and accumulate history. In a product-driven organization, a request as short as implement ticket X can therefore invoke considerably more engineering context than the prompt itself contains.

A ticket is not automatically a model. A vague reminder or unstructured work item may externalize almost nothing useful. But a carefully maintained ticket can serve as a purposeful, change-scoped model when it preserves the information needed to reason about the requested change.

[ref:fig-h-ticket-bridge] casts the ticket as a bridge model between product and system knowledge.

<!-- label: fig-h-ticket-bridge -->
<!-- figure: assets/h4-ticket-bridge-model.svg | *The ticket as a bridge model.* A well-formed ticket binds product knowledge—needs, decisions, requirements—to system knowledge—architecture, behavior, contracts, state—recording the intent, rationale, constraints, and acceptance criteria of one change. Realization and acceptance evidence follow from it. The ticket does not duplicate the models on either side; it connects one change episode to the longer-lived representations. -->

It binds one change episode to the relevant longer-lived representations.

This also gives tickets a natural temporal interpretation. A ticket written in 2022 may no longer describe the product in 2026, but it can remain an accurate representation of the intent governing the 2022 change. Its persistence then becomes useful historical engineering knowledge rather than a synchronization burden.

Maintenance follows the same pattern. A bug report models an observed discrepancy. A repair ticket records the intended correction. Regression evidence establishes whether the relevant obligation now holds. If the defect exposes a recurring structural problem, governance conversion can promote knowledge from the change into a longer-lived model or mechanism.

This inheritance can make routine maintenance unusually amenable to autonomous realization. A change-scoped ticket need not reconstruct the architecture, behavior, contracts, or quality obligations governing the affected system if those representations already exist elsewhere in the environment. Where the requested change is sufficiently clear and the governing obligations and evidence machinery already cover it, much of the remaining work can proceed without repurchasing the engineering judgment that created those structures. Where the ticket instead exposes a missing function, tacit obligation, architectural conflict, or genuinely new design question, the work returns to engineering judgment.

[ref:fig-h-change-progression] traces the progression from a local change to durable structure.

<!-- label: fig-h-change-progression -->
<!-- figure: assets/h4-change-progression.svg | *From local change to durable structure.* A local change becomes a ticket or issue, is realized, and produces acceptance evidence. If the change proves a one-off, it settles into history; if it exposes a recurring lesson, governance conversion promotes it into durable structure—a model, test, constraint, validator, or design change—that later work inherits. -->

Product management and maintenance therefore sit between transient intent and durable engineering structure. They are where many organizations can adopt MAGE with very little disruption because persistent change representations already exist.

**MAGE profile.**

- *Characteristic models.* Tickets, issues, bug reports, acceptance criteria, rationale, decisions, links to longer-lived product and system models.
- *Lifetime.* Primarily change-scoped, with historical value after the change is complete.
- *Alignment posture.* Workflow state, acceptance evidence, regression tests, and admission gates.
- *Role of autonomous reasoning.* Interpreting change intent against the current system and retrieving the longer-lived context relevant to the change.
- *Determinization opportunity.* Recurring classes of changes, acceptance conditions, and repair obligations can migrate into machinery.
- *Degrees of freedom.* Details the change request intentionally leaves to realization.
- *Smallest useful adoption.* Treat sufficiently structured tickets as change-scoped models available to agents and connect them to relevant persistent knowledge and acceptance evidence.
- *Connects to.* Product rationale upstream; engineering models during realization; incidents that create corrective work; assurance obligations affected by the change.
