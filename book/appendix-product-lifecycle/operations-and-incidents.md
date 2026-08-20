**Engineering question.** What is the system doing, why is it doing it, and what should we learn from failure?

Operations works against the realized system. Its characteristic representations include deployment topology, service dependencies, runtime configuration, telemetry, resource relationships, runbooks, incident timelines, and operational policies. These models answer questions that source code alone often answers poorly: what is running where, which services depend on which others, what resources are shared, what happened before a failure, and what operators should do next. Because these models describe the running system, many require strong correspondence. A topology presented as current must describe the deployed system closely enough to support operational reasoning; telemetry must refer to identifiable entities and states; and a runbook intended to govern response must remain applicable to the system operators actually face.

Incidents expose where the governed environment was incomplete or wrong. Restoring service fixes the instance; root-cause analysis asks what condition made the failure possible. Bidirectional traceability can connect an operational observation to the responsible implementation and from there to the architectural, behavioral, ownership, resource, or other models that describe the affected concepts.

Explicit models can also reveal where else the same condition exists. Two failures need not share similar source code to share an engineering structure: components may occupy the same modeled role, implement analogous transitions, cross equivalent trust boundaries, share ownership relations, or depend on resources with the same lifecycle. Models therefore let engineers search for the class rather than only for syntactically similar code. The ambition is longstanding: repair the class rather than the instance.

Finding the class is only half the job. Governance conversion determines whether the lesson survives the incident: correct a wrong model, represent missing knowledge, or encode a stable obligation in a validator, constraint, policy, test, or gate. The strongest outcome is not merely a successful patch, but an environment in which future work inherits what the incident taught.

[ref:fig-h-incident] shows the progression from one observed failure to a durable repair of the class.

<!-- label: fig-h-incident -->
<!-- figure: assets/h5-incident-to-governance.svg | *From incident repair to governance conversion.* An incident provides evidence about the realized system. Traceability connects the failure to the models and obligations it realizes; relationships within those models can expose other instances of the same engineering condition even when their implementations differ. Repair can then address the class rather than only the observed instance, while governance conversion preserves the lesson in models or mechanisms that future work inherits. -->

Not every incident generalizes, and repairing defect classes is not new. Root-cause analysis, defect prevention, static analysis, and related practices have long sought broader corrective action. MAGE adds an explicit representational substrate for finding analogous conditions and places to encode the resulting lesson when it can responsibly acquire authority.

Operations grows engineering capital when what one incident teaches changes what later engineering inherits.

**MAGE profile.**

- *Characteristic models.* Deployment topology, service and resource dependencies, runtime configuration, telemetry, operational state, runbooks, incident timelines, and operational policies.
- *Lifetime.* Mixed. Telemetry and incident evidence may be episode-scoped; topology, dependencies, policies, and runbooks are generally system-lived and require stronger synchronization with the realized system.
- *Alignment posture.* Strong where operational state or policy can be checked mechanically: deployment validation, health checks, policy enforcement, admission controls, automated response, and operational gates.
- *Role of autonomous reasoning.* Diagnosing incidents across runtime evidence, implementation, and system models; identifying root causes and structurally related instances; proposing corrective action; and recognizing lessons that should be converted into durable governance.
- *Determinization opportunity.* High for stable operational predicates and recurring failure classes once their governing conditions have been identified.
- *Degrees of freedom.* Operational and corrective choices left open by existing obligations. Incidents may reveal that an apparent freedom was actually constrained by an unmodeled or tacit obligation.
- *Smallest useful adoption.* Connect one recurring class of operational failure to the system models needed to diagnose it, then convert the resulting lesson into a durable representation or mechanism rather than repeatedly repairing individual instances.
- *Lifecycle connections.* Realized structure from Engineering; corrective work flowing into Maintenance; operational evidence supporting Assurance; recurring lessons converted into engineering capital for future work.
