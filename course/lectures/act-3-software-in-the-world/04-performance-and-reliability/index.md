---
title: Performance & Reliability
sessions:
  - "Performance Engineering"
  - "Reliability Engineering"
readings:
  groups:
    - heading: Modeling and improving a real system
      items:
        - cite: davis2026mage
          locator: 'chap. 4, §§4.1–4.2'
          annotation: '{mage:4.1} and {mage:4.2} Davis, 2026. Read the DocAble performance episode. The chapter follows an observed memory failure through changes in representation, execution, and resource models. The idea to carry away is that a performance improvement should be justified by an explanation of the relevant resource cost, not merely by a better benchmark result. Active alignment changes the implementation to satisfy a model; passive alignment preserves the established obligation during later changes.'
    - heading: Understanding queues and overload
      items:
        - cite: yanacek_backlogs
          annotation: 'Yanacek, ["Avoiding Insurmountable Queue Backlogs"](https://aws.amazon.com/builders-library/avoiding-insurmountable-queue-backlogs/), Amazon Builders'' Library. Read it for its account of how queues accumulate work, why long backlogs are dangerous, and how services can limit overload. Connect the examples to the lecture''s model of queues and processors. The purpose is practical reasoning about capacity, not queueing-theory derivations.'
    - heading: Measuring where time and resources go
      items:
        - cite: gregg_use_method
          annotation: 'Gregg, ["The USE Method"](https://www.brendangregg.com/usemethod.html). Read the method and its examples of resource utilization, saturation, and errors. Apply the distinction to the reservation service: database CPU may be available while the connection pool is saturated. The important question is which resource is limiting useful work, and the method applies to thread pools and file descriptors, not only to CPUs and disks.'
        - cite: opentelemetry_traces
          annotation: 'OpenTelemetry, ["Traces"](https://opentelemetry.io/docs/concepts/signals/traces/). Read the introduction and the explanations of spans and context propagation. A trace correlates operations across components, which is what lets an engineer distinguish processing time from waiting time and locate the source of end-to-end latency. This is the concrete form of the queue-and-processor model once it is instrumented.'
    - heading: Further reading
      items:
        - cite: ousterhout2018
          annotation: 'Ousterhout, "Always Measure One Level Deeper" (2018). Recommended rather than required. An aggregate performance measurement is often insufficient to identify the mechanism worth changing: end-to-end latency says something is slow, a trace says where the time is spent, and a deeper investigation explains why that operation is expensive. In DocAble, peak memory was the observed problem and media residency was the mechanism.'
    - heading: Reliability engineering
      items:
        - cite: beyer2016sre
          locator: 'chapters 21 and 22'
          annotation: 'Beyer, Jones, Petoff and Murphy (eds.), *Site Reliability Engineering: How Google Runs Production Systems* (O''Reilly, 2016), [chapter 21, "Handling Overload"](https://sre.google/sre-book/handling-overload/) and [chapter 22, "Addressing Cascading Failures"](https://sre.google/sre-book/addressing-cascading-failures/). Read both. Chapter 21 treats overload as a condition the service must be designed to survive rather than an operational surprise, and covers per-client throttling, request criticality, graceful degradation, and retry budgets. Chapter 22 follows the same argument into propagation: how one saturated resource takes down its neighbours, and why retries and health checks can accelerate a collapse they were installed to prevent. The retry budget is the idea to carry across both lectures, because a retry policy that looks correct from one client can multiply the load arriving at a service that is already failing. The book''s distributed-consensus chapters are out of scope here.'
        - cite: bhuiyan2025sokredos
          annotation: 'Bhuiyan, Çakar, Burmane, Davis and Staicu, "SoK: A Literature and Engineering Review of Regular Expression Denial of Service (ReDoS)" (ASIA CCS 2025). Read it for the component-selection case study rather than for regex internals. The question to hold is not whether ReDoS exists but what a component''s documentation does and does not tell you: the review examines engines in nine widely used languages and records where defenses and limitations go undocumented, and where maintainers regard super-linear matching as an accepted consequence of the features they support rather than a defect to fix. Carry away the general rule, which applies to every dependency: the absence of a documented limitation is not evidence that the limitation is absent.'
        - cite: cristian1991faulttolerant
          annotation: 'Cristian, "Understanding Fault-Tolerant Distributed Systems" (1991). Recommended rather than required, and read it for the framing rather than the protocols. It is the clearest statement of why a fault-tolerance claim is meaningless without a failure model: what a component is assumed to do when it fails, which classes of failure a mechanism is designed to survive, and how those assumptions bound what any amount of redundancy can deliver. That distinction underlies the whole of Lecture 2, where every mechanism is paired with the assumption it rests on.'
exercises:
  - title: Improving reservation performance
    slug: improve-reservation-performance
    about: |
      The service meets its functional specification and becomes slow during registration, and the
      requirement is unchanged: p95 at or under one second at the peak mix. Application CPU sits at
      45%, database CPU at 58%, the connection pool at 20 of 20, mean pool wait at 180 ms, and p95
      response time at 1.9 s. Say what those measurements establish, what they leave open, and what you
      would measure next, because a saturated resource tells you where to look rather than what to fix.
      The figures are illustrative rather than measured.

      Then the measurement you asked for arrives. Mean query execution time is 22 ms against a mean
      connection hold of 310 ms, so connections are held about fourteen times longer than queries run.
      Three interventions are on the table — add application replicas, add database capacity, or
      shorten the connection hold — and you choose one and name what would prove you wrong. The
      intervention is justified by the measurement, not by the symptom.
  - title: Analyze a component failure
    slug: analyze-component-failure
    about: |
      A document-processing service accepts uploaded documents through an API, places work on a
      message queue, processes it with a pool of workers, and writes results to an object store. The
      queue provides at-least-once delivery.

      A worker finishes processing and writes its output, then crashes before acknowledging the
      message. The queue, having heard no acknowledgement, delivers the message again.

      Identify the failure modes and their effects, and explain why the retry that recovers
      interrupted work is the same action that repeats work already completed. Propose a mitigation,
      and say what evidence would establish that repeated delivery does not produce an inconsistent
      result.

      The distinction to hold onto is between executing an operation once and producing one logical
      result. Only the second is achievable here, and only by design.
  - title: Design a reliable document-processing service
    slug: design-reliable-document-service
    about: |
      Four minutes in pairs. The same service: an upload API, a message queue, a worker pool, and an
      object store. It has four obligations.

      1. Accepted documents must not disappear.
      2. A worker crash must not permanently prevent processing.
      3. Duplicate messages must not produce inconsistent results.
      4. One pathological document must not exhaust the service.

      Select components and reliability mechanisms that could satisfy them, and state the failure
      assumptions your design depends on.

      Then compare three candidates: a durable queue alone; a durable queue with idempotent
      processing; and a durable queue with idempotent processing and worker isolation. Say what each
      one improves, which failures remain, and what evidence would justify accepting the design you
      choose. A durable queue does not by itself guarantee that every accepted job survives, which
      makes the acknowledgement and persistence semantics part of the answer rather than a detail.
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
materials:
  - title: "Lecture 1 slides — Performance and Reliability: Performance Engineering"
    src: 3-4-Performance-and-Reliability-1-Performance-Engineering.pptx
  - title: "Lecture 2 slides — Performance and Reliability: Reliability Engineering"
    src: 3-4-Performance-and-Reliability-2-Reliability-Engineering.pptx
labs:
  - title: Performance Engineering Laboratory
    slug: performance-lab
    about: >
      Model the reservation service as a network of queues and service stations, choose a workload,
      predict which resource will saturate, then simulate and read the evidence. Five guided
      experiments move from diagnosis to intervention: find the bottleneck by measurement rather
      than intuition, check Little's Law against the run, relieve the constraint by adding capacity
      and watch the bottleneck migrate, then reduce demand with a token cache and compare the two
      kinds of intervention. A final optional experiment shows what sustained overload does to a
      model whose assumptions require stability.
---

**Premise.** *Functional correctness does not establish that a system will behave acceptably under load, or that it will continue to satisfy its obligations when components fail. Engineers must understand the workloads and failure modes their systems will encounter, select appropriate designs and mechanisms, and obtain evidence that the result meets its requirements.*

Software systems are assembled from components that execute work, preserve state, communicate, and coordinate activity. Each component provides capabilities, consumes resources, and carries characteristic failure modes. A database may lose a write, a message broker may deliver a message twice, and a worker may exhaust its memory. Failures also arise from interactions among components that are individually behaving as specified.

Performance and reliability ask different questions about such a system. Performance engineering examines the relationship between workload, resource consumption, and observable behavior. Reliability engineering examines what can fail, how a failure affects the system, and which mechanisms can prevent, contain, or recover from it.

Both require engineering judgment. The engineer decides which workloads and which failures matter, what behavior is acceptable, and what evidence would establish that the system provides it.

## Structure of this unit

**Lecture 1, Performance Engineering.** We model how requests move through queues and processors, characterize workloads, and use measurements to find the resource that limits useful work. We compare configuration changes, architectural optimizations, and additional capacity against their costs and constraints, then ask what evidence would establish that an improvement worked. To practise the reasoning, see {exercise:improve-reservation-performance} and the {lab:performance-lab}.

**Lecture 2, Reliability Engineering.** We begin with a catalog of software components and their characteristic failure modes, including failures shared across component families and failures that arise only from their interactions. We use failure mode and effects analysis and fault trees to analyze how systems fail, then examine mechanisms for isolation, detection, recovery, redundancy, and containment. We close on the decisions that matter most: how to select a component, how to combine mechanisms whose assumptions interact, and what evidence establishes that the result meets its obligations. See {exercise:analyze-component-failure} and {exercise:design-reliable-document-service}.

Both lectures follow the Act III method: identify the problem, model what matters, exercise judgment about realization, and obtain evidence.

## Performance engineering

Registration begins, requests arrive at forty times their usual rate, and students start receiving timeouts. The software has not changed. What has?

Performance engineering examines how a system behaves under a workload. Before changing the implementation, we need to know what work is arriving, what the system does with that work, and what performance we require. We also need to distinguish a service that responds too slowly from one that may eventually exhaust its resources and stop responding altogether.

Three measurements recur throughout the analysis. **Latency** is the elapsed time required to complete an operation. **Throughput** is completed work per unit time. **Utilization** is the fraction of a resource's capacity being used. None substitutes for the others. A service may complete many requests per second while some users wait unacceptably long, and low CPU utilization does not establish that other resources have available capacity.

## Modeling the system

A useful first model represents the system as a network of queues and processors. Requests arrive, wait for resources, undergo processing, and eventually complete. A reservation request might wait for an application worker, execute booking logic, wait for a database connection, execute a query, and wait for a row lock. Each stage contributes to the elapsed response time.

This model distinguishes waiting time from processing time. A request waiting for a database connection consumes elapsed time without necessarily consuming application CPU. Adding application workers will not remove that wait if the database connection pool remains the limiting resource. The figure shows one reservation request moving through those stages: the blue containers hold work that is waiting, and the outlined stations hold the work being performed.

![A request flows top to bottom through four shapes. Two pale blue containers are queues, each holding individually outlined requests that have arrived and cannot yet be served: the HTTP request queue holds R4, R3, R2 and R1; the database connection queue holds R7, R6 and R5, and is labelled as waiting for a connection, consuming elapsed time but no application CPU. Between and after them are two outlined service stations performing work, each holding the one request it is serving: the application, evaluating the booking rules, holds R0; the database, running the query, holds R8 and is labelled as the station inside which lock waits live. An arrow at each queue-to-station boundary is labelled with its admission condition, admitted when a handler is free and admitted when a connection is free. A legend names the two shapes: a blue container is a queue, work waiting for capacity; an outlined box is a service station, work being performed.](figures/queues-and-service-stations.svg)

Queues also explain how performance problems can become failures. Suppose 120 requests arrive each second while a processor completes only 100. If those rates persist and no work is rejected, the backlog grows by approximately twenty requests per second. A bounded queue eventually rejects additional work. An unbounded in-memory queue can continue consuming memory until the system exhausts its resources. Rejection is not successful service, but it may protect the system from a more extensive failure.

The engineer must therefore understand not only which components exist, but where work can accumulate, what limits each resource, and what happens when those limits are reached.

## Characterizing the workload

A system model describes how work is processed. A workload model describes the work arriving.

For the reservation service, the workload includes request rate, operation mix, concurrency, resource demand, and variation over time. Searches and bookings may arrive at the same rate but place very different demands on the database. Registration can produce bursts that are absent during ordinary use.

| Workload property | Engineering question | Reservation example |
|---|---|---|
| Request rate | How often does work arrive? | Reservations per second |
| Operation mix | What kinds of work arrive? | Searches, bookings, cancellations |
| Concurrency | How much work overlaps? | Simultaneously active requests |
| Service demand | What does each operation consume? | Database queries, CPU time |
| Variation | How does demand change over time? | Registration bursts |

A performance requirement is meaningful only against a stated workload. A service that satisfies a one-second latency requirement during an ordinary afternoon may fail it during registration.

Latency is also a distribution. The median describes the experience of the middle request; p95 and p99 expose increasingly slow portions of the workload. A requirement that 95% of requests complete within one second cannot be evaluated from mean latency alone.

## Relating workload, concurrency, and capacity

**Little's Law** relates three measured averages for a stable system: `L = λW`. Here `L` is the average number of requests in the system, `λ` is average throughput, and `W` is average time in the system. At 100 completed requests per second and 0.2 seconds per request, approximately twenty requests are outstanding on average.

This relationship is useful for estimating average concurrency and checking measurements. It does not identify where requests are waiting, determine maximum concurrency, or independently predict latency from throughput.

To predict how waiting changes with load, we need additional assumptions about the system. A simple single-server queueing model illustrates the result: as utilization approaches capacity, response time can increase sharply. Real systems may not satisfy that model's assumptions, but the phenomenon matters. Engineers must leave enough capacity to accommodate variation rather than sizing a system solely for its average workload.

To explore the effect, see {lab:performance-lab}.

## Measuring and diagnosing performance

A system model tells us where waiting could occur. Instrumentation tells us where it actually occurs.

A trace records the operations involved in servicing a request. Recording when work enters and leaves queues, and when processing begins and ends, lets engineers distinguish waiting from computation. Correlated spans reconstruct the request's path across components.

Different measurements answer different questions. CPU profiling identifies where processor time is consumed. Tracing exposes elapsed time across operations, including time spent waiting. Resource metrics reveal utilization, saturation, and errors. Database execution plans explain the work performed by individual queries.

A bottleneck is the constraint whose relief would improve useful throughput or bring response times within the required bounds. It is not necessarily the component with the highest CPU utilization.

Suppose application CPU utilization is modest, but every database connection is occupied. Adding application replicas may increase the number of requests waiting for connections without materially improving throughput. The next measurement should establish why connections remain occupied: slow queries, lock waits, long transactions, or connections retained unnecessarily.

Relieving one bottleneck often exposes another. Performance improvement is therefore iterative: measure, change, and measure again. To practise diagnosing a bottleneck and watching it move, see {lab:performance-lab}.

## Improving performance

Once the limiting cost is understood, several kinds of intervention are available.

**Configuration tuning** changes how existing components operate. Examples include adjusting worker concurrency, connection-pool size, queue limits, cache capacity, and timeouts. These parameters interact. Increasing concurrency can improve throughput until another shared resource becomes saturated. Shortening timeouts can reduce waiting while increasing the number of failed requests.

The tuning problem can be expressed as choosing a configuration that balances objectives such as latency and cost while satisfying constraints on errors, memory, connections, or other resources. A configuration that works for today's workload may not work after demand changes. Engineers may transfer settings from similar systems, search parameter combinations, or automate experiments, but every candidate requires evaluation against a representative workload.

Other optimizations change the work itself. **Caching** avoids repeated computation or retrieval. **Batching** amortizes fixed overhead. **Better algorithms and data structures** reduce work per operation. **Parallelism** executes independent work concurrently. **Changing the placement** of data or computation can reduce communication. **Streaming** reduces the amount of input that must remain resident in memory.

Each technique has conditions under which it helps. A cache consumes memory and introduces consistency concerns. Parallelism may exploit idle cores, but can introduce synchronization and contention. Streaming can reduce memory consumption while increasing remote access or coordination.

**Autoscaling** belongs to a different category. The techniques above change how much work a request requires; autoscaling changes how much capacity is available to serve it, by adding or removing instances in response to demand or another scaling signal. It helps only when an added instance supplies useful service capacity. Replicas placed in front of a saturated shared resource relocate the queue rather than shorten it. Scaling also takes time, so a burst arriving faster than instances can start is absorbed by whatever headroom already existed, which is why admission control or advance provisioning may still be required.

Some optimizations are effectively free lunches within the relevant operating conditions. Eliminating redundant work may improve performance without materially increasing another runtime cost. Using an idle core may reduce latency without additional hardware, although synchronization, memory, and power costs still matter. Even an optimization with no consequential runtime downside requires engineering effort to implement and validate.

The operating environment changes the judgment. Embedded systems may be constrained by fixed memory, deadlines, energy, and thermal budgets; where hardware is fixed after deployment, optimization can be a condition of feasibility rather than a saving. Cloud services may have elastic capacity but incur costs for memory, computation, storage, and communication. The same optimization can be attractive in one environment and inappropriate in another.

Where capacity can be purchased, engineering effort and infrastructure expenditure become partially substitutable, and the decision acquires a break-even point. Optimizing an implementation costs engineering time once; operating additional capacity costs money for as long as the service runs. Which is cheaper depends on the expected lifetime of the system, the growth of demand, and the maintenance burden the optimization introduces. A technically faster implementation is therefore not necessarily the economically preferable one. Performance engineering means selecting an implementation and operating configuration that satisfy the stated requirements under the relevant constraints, which sometimes means accepting worse performance because the improvement is not worth its cost.

## A case study: DocAble

Chapter 4 of *Model-Based Agentic Engineering* follows a performance problem in DocAble, a document-accessibility remediation system.

A media-heavy PowerPoint presentation of roughly 250 MB exceeded the memory available to a worker. The initial architecture retained document structure and media together. Dividing documents into page chunks reduced the working set, but each chunk still retained its media.

The eventual solution changed the representation. Skeletonization separated document structure from large media objects, leaving references in the worker and streaming media when needed. This reduced the dependence of resident worker memory on aggregate media size, subject to explicit assumptions about structural size, streaming buffers, and active working state.

The change illustrates **active alignment**. A memory model states the required property; measurements identify where the implementation violates it; implementation changes are made and evaluated against the model. Once acceptable behavior is established, appropriate checks can preserve the property during later changes. This is **passive alignment**.

## Establishing that an improvement worked

An optimization is not complete when a benchmark improves once.

Before evaluating a change, establish acceptance conditions. For the reservation service, these might include p95 latency at or below one second during registration, sufficient completed throughput, bounded connection-pool waiting, and controlled behavior when offered load exceeds capacity.

The test workload must reproduce the relevant operation mix, concurrency, bursts, data size, and cache state. Repeated measurements help distinguish a genuine improvement from variation.

An improvement may also move the bottleneck. After shortening database connection holds, the application CPU or a row lock may become the limiting resource. The engineer must measure the resulting system rather than assume that removing the original bottleneck completes the work.

To practice this reasoning, see {exercise:improve-reservation-performance}.

Performance and reliability meet at overload. Bounded queues, admission control, and timeouts can protect resources, but may reject work or leave clients uncertain about outcomes. Retrying failed requests can increase the load on an already saturated service. The next lecture examines what the system must do when components fail and how to establish that its recovery behavior is acceptable.

## Reliability engineering

Software engineers rarely build a system entirely from scratch. They assemble components that provide execution, storage, communication, coordination, and other capabilities. A service might use an HTTP server, a message queue, a worker pool, a database, a cache, and a load balancer. Each component solves a problem, and each introduces a dependency and a set of possible failures.

Reliability engineering asks whether the assembled system continues to satisfy its obligations under specified failures. A claim that a system is reliable is incomplete without three things: the behavior required, the failures considered, and the conditions under which the claim holds.

## The software hardware store

Components can be organized by the capabilities they provide, much as a hardware store organizes tools and materials by what they are for.

| Capability | Representative components | Engineering question |
|---|---|---|
| Execute work | Processes, containers, serverless functions | How is execution isolated? |
| Preserve state | Filesystems, databases, object stores | What durability is guaranteed? |
| Exchange information | RPC, message brokers, event streams | Can messages be lost or duplicated? |
| Coordinate activity | Locks, schedulers, consensus services | What happens when a participant fails? |
| Accelerate access | Caches, CDNs, connection pools | How stale may the result be? |
| Direct work | Load balancers, orchestrators, service discovery | How are unhealthy components handled? |

These categories are not mutually exclusive. A message broker may also provide durable storage, and a database may provide coordination through transactions and locks. The catalog is a way to recognize the capabilities available and, more usefully, to identify the question each one raises when a component is selected.

Components share some failure modes. Processes, databases, communication services, and coordination mechanisms can all become unavailable, exhaust resources, behave incorrectly, or be misconfigured. Many can also be compromised through an exploitable vulnerability. The causes and consequences differ by component, but the broad classes recur.

Other failures are characteristic of a family. Caches return stale values and suffer stampedes. Message brokers lose, duplicate, or reorder messages, depending on the delivery guarantee they offer. Databases suffer corruption, lost writes, and transaction anomalies. Schedulers miss work or run it more than once.

Failures also arise from interactions. A client retries when a service slows down, adding to the load that caused the slowdown. Two replicated services share a database whose failure disables both. A cache returns an old value while the database correctly holds a newer one. In each case the components behave according to their specifications and the system fails to provide what its users require.

The engineer therefore has to understand both component behavior and the consequences of assembling components into a system.

## Analyzing failures

Knowing that components can fail is not enough. We need to identify which failures matter for a particular system, and how they could produce an unacceptable outcome. Two established techniques approach the problem from opposite directions.

**Failure mode and effects analysis** works from the bottom up. Starting with a component, the engineer asks how it can fail, what effects follow, how the failure could be detected, and what mitigation might be appropriate.

Consider the document-processing service: an upload API, a message queue, a pool of workers, and an object store for results.

| Component | Failure mode | Effect | Detection | Candidate mitigation |
|---|---|---|---|---|
| Message queue | Duplicate delivery | Work executes twice | Repeated job identifier | Idempotent consumer |
| Worker | Crash during processing | Work remains incomplete | Missing completion | Restart and retry |
| Object store | Write failure | Output unavailable | Write error | Retry or fail the job |

The table connects each proposed mitigation to a specific failure, which is its first value. Its second is that it exposes the interactions between failures and the mechanisms meant to recover from them.

Suppose a worker writes its output successfully and crashes before acknowledging the message. A queue providing at-least-once delivery will deliver that message again. Retrying is what allows the system to recover from interrupted processing, and it is also what repeats work that already completed. The engineer must decide whether repetition is acceptable and, if it is not, how the application will prevent duplicate effects.

**Fault-tree analysis** begins with an unacceptable outcome and works backward to the events that could produce it. Suppose the top event is that a completed document becomes permanently unrecoverable. One explanation requires two conditions together: the primary copy is unavailable, and no usable recovery copy exists.

A fault tree represents these relationships with logical gates. An OR gate means any one input event is sufficient to produce the event above it. An AND gate means every input event is required.

The gates express logical relationships, not statistical independence. Two replicas may fail together because they share a power supply, a configuration, a software defect, or an upstream dependency. An AND gate does not license multiplying two failure probabilities unless the independence assumption has been established separately.

The two techniques are complementary. Failure mode and effects analysis asks what a component's failure can cause. Fault-tree analysis asks what events or combinations could produce a particular unacceptable outcome. Used together, they identify the failures that deserve engineering attention.

## Engineering for reliability

Once the relevant failures are understood, mechanisms can be selected to prevent them, detect them, contain their effects, or restore acceptable operation. The mechanisms are usefully organized by purpose.

| Purpose | Representative mechanisms |
|---|---|
| Isolation | Containers, bulkheads, resource limits |
| Detection | Health checks, heartbeats, watchdogs |
| Recovery | Restart, retry, failover |
| Redundancy | Replication, diverse implementations, N-version programming |
| Containment | Circuit breakers, admission control, backpressure |
| State protection | Transactions, idempotency, durable logging, backups |

**Isolation, detection, and recovery** work as a chain. A container provides an execution boundary, a watchdog detects a failed or unresponsive process, and a restart policy attempts to restore operation. None of them guarantees recovery on its own. Restarting a process does not restore corrupted state, and restarting a process that keeps meeting the same defect produces a restart loop rather than a recovery.

**Redundancy and diversity** are not the same thing. Replication preserves service when a machine or instance fails, provided the replicas and their dependencies are sufficiently independent. Identical replicas remain vulnerable to a defect in the implementation they share. N-version programming attempts to tolerate implementation faults by running independently developed versions and comparing their results; its effectiveness depends on achieving meaningful diversity and on a suitable decision procedure, neither of which is guaranteed by the arrangement itself.

**Containing failures** limits consequences rather than removing causes. A circuit breaker stops repeated calls into an unhealthy dependency, letting callers fail promptly or take an alternative path. A bulkhead partitions resources so one workload cannot exhaust what another depends on. Neither repairs the failing dependency.

**Recovering from transient failures** depends on a judgment about what the failure was. A timeout bounds how long a caller waits; a retry attempts recovery where another execution may succeed; exponential backoff spaces repeated attempts; and jitter reduces synchronization across clients. Retrying is not automatically safe. A timed-out operation may already have completed, and repeated requests can amplify the overload that produced the timeout.

**Protecting state** addresses obligations the other categories do not. Transactions prevent selected partial updates, idempotency controls the effects of repeated operations, durable logging supports recovery of committed changes under stated assumptions, and backups provide recovery points. These are not interchangeable. Replication does not substitute for a backup, because it copies a mistake as faithfully as it copies a write; and an idempotent operation need not execute exactly once, it need only produce one logical result.

The engineering task is not to install every available mechanism. It is to select mechanisms whose guarantees address the failures the system must actually tolerate.

## Selecting and integrating components

Component selection is itself a reliability decision. The behavior of a component becomes part of the system's assumptions, so it has to be investigated before it is depended upon.

The relevant questions concern the component's documented semantics, resource bounds, concurrency behavior, failure modes, and recovery guarantees. They also concern the maintainer's policies: how defects are reported, whether security vulnerabilities receive coordinated disclosure, which versions receive fixes, and what compatibility commitments accompany an update.

A component's documentation may simply omit the behavior that matters to the application. The absence of a documented limitation is not evidence that the limitation does not exist.

## Case study: regular expression denial of service

Regular expression engines illustrate the problem. Applications use them to recognize patterns in text, often treating a match as a simple operation returning success or failure. The engine also consumes time and memory, and its matching semantics determine which strings it accepts.

Three questions matter when selecting one. Can a pattern and input cause excessive execution time? Can matching consume excessive memory? Does the engine produce the intended match or mismatch? Available controls include selecting an engine with appropriate complexity guarantees, restricting the pattern features supported, bounding input and pattern sizes, isolating execution, enforcing resource limits, and testing behavior against the intended semantics.

A systematic review of regular expression denial of service examined engines in nine widely used programming languages. Backtracking engines can exhibit super-linear worst-case behavior, and relevant defenses and limitations were often undocumented. Maintainers have sometimes regarded such behavior as an accepted consequence of supporting extended regular-expression features rather than a defect requiring correction.

The lesson generalizes past regular expressions. Selecting a component requires investigating the behavior relevant to the intended application, including behavior its maintainers may consider the user's responsibility.

## Selecting reliability mechanisms

The same scrutiny applies to the mechanisms themselves.

| Failure | Candidate mechanism | Required assumption |
|---|---|---|
| Process crash | Restart | State can be recovered |
| Transient network failure | Retry | Repetition is safe |
| Persistent dependency failure | Circuit breaker | The caller can fail or degrade |
| Machine failure | Replication | Failures are sufficiently independent |
| Duplicate message | Idempotency | Operation identity is stable |
| Data loss | Backup and recovery | The recovery point is acceptable |

The rightmost column decides whether the mechanism is appropriate. A retry policy cannot safely recover an operation whose repeated effects violate an invariant. Replication cannot tolerate a shared failure that disables every replica. A mechanism whose assumption does not hold provides the appearance of protection without its substance.

Mechanisms also interact. A client may retry an operation that already committed. Retries may increase the load presented to admission control, which is placed to reduce it. A circuit breaker may reject a request the dependency could have served successfully. Placement and configuration therefore matter as much as the behavior of any mechanism in isolation.

Consider the document-processing service again. A durable message queue lets work survive a worker crash, and duplicate delivery then requires an idempotency policy. Resource limits and worker isolation keep a pathological document from exhausting the service. The design must also account for the queue's acknowledgement semantics, the persistence of job state, and what happens after processing is interrupted partway.

The engineer has to establish which combination of components and mechanisms satisfies the system's obligations, rather than assuming that adding reliability features improves reliability.

## Establishing evidence

A reliability design is not finished when its mechanisms have been selected. The engineer must establish that the assembled system behaves acceptably under the failures it claims to tolerate. Fault injection introduces those failures deliberately, under controlled conditions, and observes what the system does.

| Reliability claim | Failure injected | Evidence sought |
|---|---|---|
| Worker crashes are recoverable | Kill a worker during processing | The job eventually completes |
| Duplicate delivery is safe | Deliver the same message twice | One logical result |
| Resource exhaustion is contained | Submit a pathological document | Other jobs remain serviceable |
| Stored outputs survive failure | Remove a storage instance | Recovery meets the stated objective |

Each test is evaluated against an explicit requirement. A job that eventually completes may still violate a recovery-time objective. A system that survives one worker crash may fail when several workers share a dependency that has become unavailable.

Recovery paths are the least exercised code in most systems and the code most needed when something goes wrong, which is why they have to be tested deliberately rather than observed in production. Passing a fault-injection test establishes behavior under the conditions tested. It does not establish reliability in general.

## Engineering judgment

Performance and reliability engineering use different models and share a method. Performance models explain resource consumption, waiting, and capacity. Failure models explain how components and their interactions produce unacceptable outcomes. Both support decisions about what to change, and about what evidence would justify the change.

The two concerns interact in both directions. Additional capacity reduces overload-induced failures. Retries recover transient faults and increase offered load. Admission control preserves service for accepted work by rejecting other requests immediately. A design that improves one property often weakens another, so the two are evaluated together rather than in sequence.

Reliability engineering therefore asks for more than a list of failures or a familiarity with reliability patterns. The engineer must understand the components selected, the assumptions behind the mechanisms chosen, and the behavior of the system they compose.

The next unit, Security Engineering, examines failures produced deliberately, by an adversary reading the same architecture you are.
