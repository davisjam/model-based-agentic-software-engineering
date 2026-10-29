---
title: Performance & Reliability
sessions:
  - "Performance Engineering"
  - "Reliability Engineering"
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
---

*How does the system behave under workload and component failure?*

Both lectures reason quantitatively about behavior the functional specification does not determine. Performance asks what the system does under load; reliability asks what it does when parts of it fail. The two interact, and the engineer must choose which bounds to preserve.

**Lecture 1: Performance Engineering.** Functional correctness does not establish adequate behavior under realistic workloads. We introduce latency, throughput, utilization, profiling, bottlenecks, and workload characterization. Simple quantitative models, including Little's Law where appropriate, help predict the consequences of design choices; measurements test those predictions. The reservation service provides a concrete setting for exploring concurrent requests and database contention. Students distinguish a useful performance model from a measurement that merely reports activity.

**Lecture 2: Reliability Engineering.** Real components fail, networks delay messages, and retries can repeat operations. We examine failure models, timeouts, retries, idempotence, backpressure, circuit breakers, and recovery. State machines and invariants make permitted behavior explicit, while fault injection and tests provide evidence about selected failure scenarios. Performance and reliability interact: retrying a failed operation can improve recovery from transient faults while worsening an overloaded service. The engineer must choose the behavior and bounds the system should preserve.

## Readings

*Readings forthcoming.*
