---
title: Operations & SRE
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
---

*How can operators understand, recover, and learn from the running system?*

Predeployment validation cannot produce evidence about a system in service. This unit covers what operators observe, what they do when the system misbehaves, and how an incident becomes a change to the software or to the environment that produced it.

**Lecture: Operations, Observability & Incident Response.** A deployed system must be understood through observations of its actual behavior. We distinguish logs, metrics, and traces; introduce service-level indicators and objectives; and discuss alerting, incident detection, and the costs of operational supervision. The reservation service supplies a setting in which an operator must distinguish a slow request, a failed dependency, and a service outage. Observability provides evidence that predeployment validation could not obtain. Runbooks then describe operational procedures, while incident response and postmortems organize diagnosis, recovery, and corrective action. An incident may require a local repair, an architectural change, a new test, or a change to the operating environment. This returns to Failure-Aware Engineering: observations should inform both the software and the mechanisms that govern future work, and repairing one failure differs from changing the conditions that allowed its failure class to recur.

## Readings

*Readings forthcoming.*
