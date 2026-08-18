**Engineering question.** What is the system doing, how should it be operated, and what should we learn when it fails?

Operations provides a useful counterweight to the idea that MAGE primarily means richer semantic models.

Mature operations already depends heavily on explicit representations: deployment topology, desired configuration, telemetry schemas, SLOs, permissions, dashboards, runbooks, and incident records. But operational knowledge often has a strong path toward procedure and determinization.

A novel failure may initially require semantic diagnosis. If the same diagnosis and response recur, engineers may write a runbook. If the runbook’s preconditions, actions, and postconditions become sufficiently stable and decidable, much of it should cease to require an agent at all.

[ref:fig-h-ops-determinization] follows operational knowledge as it travels from situational diagnosis toward deterministic procedure.

<!-- label: fig-h-ops-determinization -->
<!-- figure: assets/h5-operational-determinization.svg | *Operational knowledge determinizing.* A novel or situational failure first requires semantic diagnosis; when the diagnosis and response recur, engineers write a runbook; when the runbook’s preconditions, actions, and postconditions become stable and decidable, much of it migrates into deterministic procedure—monitors, permissions, actions, postcondition and rollback gates. The destination of operational governance conversion is often machinery, not a better prompt. -->

This is governance conversion expressed operationally. The destination is not necessarily a better prompt. Often it is machinery.

The agent remains useful around the boundary: Which runbook applies? Do these symptoms actually match its preconditions? Is the current event sufficiently novel that the deterministic procedure should not run? How should observations from several systems be synthesized? What causal account best explains the failure?

The same distinction applies to incidents.

An incident timeline or RCA is usually episode-scoped. It reconstructs what happened and why existing controls failed to prevent or contain it. Its enduring engineering value depends on what happens next.

[ref:fig-h-incident-conversion] shows an incident’s lesson either repaired locally or converted into durable governance.

<!-- label: fig-h-incident-conversion -->
<!-- figure: assets/h5-incident-governance-conversion.svg | *From incident to inherited lesson.* Telemetry and history reconstruct an incident as a timeline or RCA; a structural judgment then decides whether the failure is a local event to repair or a recurring gap worth durable treatment. Governance conversion promotes the recurring case into a model update, a mechanism or gate, or an architectural or runbook change, so future work inherits the lesson. -->

Not every incident deserves another control. Responding mechanically to every failure by adding machinery would accumulate bureaucracy rather than engineering capital. The judgment is whether the event reveals a recurring or sufficiently consequential obligation worth durable treatment.

One useful way to state the transition is:

Experience often begins at the lifetime of an episode and becomes engineering capital when useful knowledge is promoted to the lifetime of an obligation.

**MAGE profile.**

**Characteristic models.** Operational topology, configuration, SLOs, telemetry schemas, runbooks, incident timelines, causal accounts, RCAs.

**Lifetime.** Current-state, episode-scoped, and system-lived representations coexist.

**Alignment posture.** Often strong: permissions, monitors, health checks, rollout and rollback gates, automated procedures, and postcondition checks.

**Role of autonomous reasoning.** Diagnosis, novel situations, selecting and composing procedures, interpreting observations whose semantics exceed existing machinery.

**Determinization opportunity.** Particularly high. Stable operational judgment should migrate from repeated reasoning into runbooks and, where possible, from runbooks into deterministic tooling.

**Degrees of freedom.** Situational choices not settled by operational obligations or safe procedures.

**Smallest useful adoption.** Make consequential operational state and procedures explicitly available to agents; bind high-consequence actions with permissions and observable conditions.

**Connects to.** Engineering components and architecture; maintenance tickets created by failures; assurance claims supported by runtime evidence.
