**Engineering question.** What change are we asking for, and why?

Many software organizations already possess a lightweight modeling substrate without calling it one: the ticketing system. A structured ticket can preserve desired behavior, rationale, acceptance criteria, affected concepts, constraints, related changes, and prior decisions. When it carries enough information to reason about one requested change, it functions as a purposeful change-scoped model. It need not duplicate longer-lived models; it should connect the episode to the product and system knowledge that governs it.

The change-scoped nature of the ticket matters. A ticket written in 2022 need not describe the product in 2026, but it can remain an accurate representation of the intent governing the 2022 change. Its persistence is then useful history rather than a synchronization burden. Maintenance uses the same pattern: an issue can preserve the discrepancy, intended correction, rationale, and acceptance evidence.

For many tickets, however, specifying the requested outcome is not the difficult part. The difficult part is diagnosis: determining why the observed behavior occurs, locating the responsible concepts and components, and identifying the system models and obligations that govern a correct change. This is especially apparent in defect repair, where root-cause analysis may dominate the work. MAGE's bidirectional traceability between models and implementation reduces that search problem. An observation in the realized system can be traced from code to the relevant architectural, behavioral, ownership, or other system models; reasoning over those models can in turn identify the implementation that realizes them. The ticket can therefore become a point of entry into the governed engineering environment rather than a standalone description from which an agent must reconstruct the system.

A ticket also reopens a particular region of the product to choice. Existing intent, architecture, contracts, and acceptance machinery may already settle most consequential questions, leaving an agent only implementation choices. Other changes expand the realization surface, expose a tacit obligation, or require new design judgment. Maintenance therefore does not simply consume a fixed stock of degrees of freedom; each change encounters and may alter the choice space defined by current obligations.

[ref:fig-h-change] brings these relationships together.

<!-- label: fig-h-change -->
<!-- figure: assets/h4-change-diagnosis-inheritance.svg | *Change-scoped models, degrees of freedom, and inheritance.* A ticket or issue provides an entry point into a change episode. Bidirectional traceability helps locate the responsible implementation and the models and obligations that govern it. Those inherited obligations bound the realization space while leaving some choices open. Acceptance evidence establishes whether the realized change satisfies its obligations; recurring or consequential lessons can then be converted into durable structure that future work inherits. -->

Maintenance is not inherently more automatable than new engineering; its advantage is inheritance. A mature product may already provide the models, obligations, evidence machinery, traceability, and prior decisions that settle questions a greenfield change must answer. When they cover the requested change, realization becomes cheaper. When the ticket exposes a missing capability, tacit obligation, architectural conflict, or new design question, judgment returns.

Ticketing is an accessible MAGE surface because many organizations already preserve change-scoped intent. The useful move is not to enrich every ticket, but to connect consequential change intent to the longer-lived knowledge and evidence needed to govern the change.

**MAGE profile.**

- *Characteristic models.* Tickets and issues containing change intent, rationale, constraints, acceptance criteria, and links to longer-lived product and system models.
- *Lifetime.* Primarily change-scoped, with historical value after the change is complete.
- *Alignment posture.* Workflow state, acceptance evidence, regression tests, and admission gates, backed by the longer-lived obligations relevant to the change.
- *Role of autonomous reasoning.* Diagnosing reported problems, locating the relevant system context, interpreting change intent against it, and realizing choices that governing obligations leave open.
- *Determinization opportunity.* Recurring classes of changes, acceptance conditions, and repair obligations can migrate into deterministic machinery.
- *Degrees of freedom.* Choices left open by the obligations governing the particular change. A change can preserve, narrow, expose, or expand that choice space.
- *Smallest useful adoption.* Treat sufficiently structured tickets as change-scoped models, connect them through traceability to relevant persistent knowledge and acceptance evidence, and allow later work to inherit rather than reconstruct that context.
- *Lifecycle connections.* Product rationale and accepted intent from Discovery; persistent system models and their implementation from Engineering; corrective work originating in Operations; assurance obligations and evidence affected by the change.
