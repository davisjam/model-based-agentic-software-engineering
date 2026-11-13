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
    - heading: What a service should do when asked for more than it can deliver
      items:
        - cite: beyer2016sre
          locator: 'chapter 21, Handling Overload'
          annotation: 'Beyer, Jones, Petoff and Murphy (eds.), *Site Reliability Engineering: How Google Runs Production Systems* (O''Reilly, 2016), [chapter 21, "Handling Overload"](https://sre.google/sre-book/handling-overload/). Read the whole chapter. It treats overload as a condition the service must be designed to survive rather than as an operational surprise, and it covers per-client throttling, request criticality, graceful degradation, and retry budgets. The retry budget is the idea to carry away: a retry policy that looks correct from one client can multiply the load arriving at a service that is already failing, which is the mechanism connecting this unit''s two lectures. [Chapter 22, "Addressing Cascading Failures"](https://sre.google/sre-book/addressing-cascading-failures/), is optional and extends the same argument. The book''s distributed-consensus chapters are out of scope here.'
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
  - title: The gate decides what must go wrong together
    slug: fault-tree-gates
    about: |
      Four minutes in pairs, and you state your failure assumptions first. One outcome is given — a
      student receives confirmation, but the reservation is absent afterward — and it names two facts
      that must hold together: a false confirmation, confirmed without evidence, and no durable
      reservation, absent when the student looks. Decide each gate, then place every event where it
      belongs: confirmation sent before the commit, the write result never checked, the reservation
      never written, the write rolled back or lost. An event that is not sufficient on its own belongs
      under an AND, which is what makes gate selection a claim rather than a drawing.

      The exercise resumes later in the lecture, after the mitigation mechanisms, as step 3. Prioritize
      one of durability and recovery settings, a confirmation protocol tied to committed state,
      rehearsed backup restoration, or monitoring that finds missing records — then say whether your
      choice prevents the top event or only detects it afterward, and what evidence would justify
      accepting it. A mitigation you cannot justify with evidence is a preference, not a decision.
  - title: A reservation that may already exist
    slug: reservation-may-already-exist
    about: |
      Three minutes in pairs, then the room compares answers to question 3. The database commits the
      reservation, the HTTP response is lost, and the client times out and submits the same request
      again. Four questions:

      1. What does the client know after the timeout?
      2. Which property of the system must remain invariant?
      3. What information would let the server recognize a retry?
      4. What evidence would establish that concurrent duplicate requests are handled correctly?

      The intended solution separates the identity of the requested operation from that of the
      resulting reservation. A persistent idempotency record, coordinated atomically with the
      reservation outcome, lets a repeated request return the original result instead of creating a
      second booking.
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

**Premise.** *Functional correctness does not establish that a system will behave acceptably under load or preserve its obligations when components fail. Engineers must model the workloads and failures the system will meet, decide what behavior is acceptable, and obtain evidence that the implementation delivers it.*

Our campus reservation service runs in a suitable environment, stores reservations durably, and has an architecture we can examine and change. Its API passes its functional tests. None of that establishes whether it can serve hundreds of students at once, or what it does when its database becomes unavailable.

Those are two different problems. Performance concerns the relationship between workload, resource consumption, and observable behavior. Reliability concerns whether the system keeps providing its required behavior over time, including when parts of it fail.

In both, the engineer decides which workloads and failures matter, what behavior is acceptable, and what evidence would settle whether the system provides it.

## Structure of this unit

**Lecture 1, Performance Engineering.** We model how requests move through queues and processors, characterize the workload, and use measurements to identify bottlenecks. We then compare configuration changes and architectural optimizations, considering their costs and constraints, before establishing whether an improvement worked. To practice this, see {exercise:improve-reservation-performance}.

**Lecture 2, Reliability Engineering.** We analyze what can fail using failure mode and effects analysis, decompose one unacceptable outcome with a fault tree, specify recovery behavior as a state machine, and only then select mitigations and the evidence justifying them. To practice this, see {exercise:fault-tree-gates} and {exercise:reservation-may-already-exist}.

Both follow the Act III method: identify the problem, model what matters, exercise judgment about realization, and obtain evidence.

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

Reliability is a claim about a time horizon and a set of failure assumptions, which is why an availability figure quoted without them says so little. Under a simple time-based definition, 99.9% availability over thirty days permits 43.2 minutes of unavailable time. That figure still does not say where the service boundary falls or what counts as a successful request.

The better question is what the service promises while a component is unavailable. Four obligations are specific enough to engineer against.

- **Do not falsely report success.** A confirmation must name a reservation that exists.
- **Do not lose a confirmed reservation.** A booking must survive the failures we tolerate.
- **Do not duplicate an operation.** A retry must not produce a second reservation.
- **Bound the damage.** A failure must not consume resources without limit, nor spread to working parts.

Deciding which failures to tolerate, and at what cost, requires analysis before mechanisms. Three models do three different jobs here.

| Technique | Engineering question | Representation |
|---|---|---|
| Failure mode and effects analysis (FMEA) | What can fail, what happens, and what should we address? | Component failure table |
| Fault-tree analysis | How could one unacceptable outcome occur? | Boolean AND/OR decomposition |
| State machine | What behavior is permitted as the system responds? | States and transitions |

FMEA and fault trees analyze how the system *can* fail. A state machine specifies how it *should* behave. Knowing that timeouts, retries, and circuit breakers exist is not yet engineering; deciding which failures matter and which controls are justified is.

## Identifying failures with FMEA

FMEA works from the bottom up: the engineer walks the components and operations, naming each failure mode, its effect, its detection, and its mitigation.

| Component | Failure mode | Effect | Detection | Mitigation |
|---|---|---|---|---|
| Database | Unavailable | Cannot confirm reservations | Connection errors | Fail closed; recover the service |
| Network | Response lost | Client uncertain whether the booking succeeded | Client timeout | Idempotency key |
| Application | Process crashes | In-flight request interrupted | Health check | Restart; recover the outcome |
| Connection pool | Exhausted | Requests wait or fail | Pool metrics | Admission limits; capacity |
| Retry logic | Excessive retries | Load amplification | Retry-rate metrics | Backoff; retry budget |

Five rows do more engineering work than a list of reliability mechanisms, because every mitigation now answers to a named failure. The last two rows join the lectures: pool exhaustion and retry amplification have capacity-related causes, both visible in Lecture 1 as queueing.

Qualitative severity and likelihood judgments are a reasonable way to decide which rows to investigate first. Multiplying ordinal severity, occurrence, and detectability ranks into a risk priority number is not: the product invites more confidence than the judgments behind it can carry.

## Explaining unacceptable outcomes with fault trees

FMEA starts at components and asks what their failure causes. Fault-tree analysis runs the other way, from an outcome the system must not produce to the combinations of events that would produce it.

![The tree reads downward from a top event banner, A CONFIRMED RESERVATION IS LOST, drawn in the failure color and labeled the outcome we refuse to accept. Below it an OR gate, drawn with the conventional curved bottom edge, feeds two intermediate events side by side: on the left, COMMITTED DATA LOST, the record no longer exists anywhere; on the right, NOT RECOVERABLE, the record exists but cannot be restored. Each intermediate event carries its own gate. Beneath COMMITTED DATA LOST is an AND gate, drawn with a flat bottom and a rounded top, taking two basic events: primary storage fails, and the backup is unavailable. Beneath NOT RECOVERABLE is a second OR gate taking two basic events: the recovery procedure fails, and the recovery data is corrupted. A legend states that OR occurs when any one input occurs, while AND occurs only when every input occurs together, so the left branch names two defenses that must fail at the same time. A closing italic note reads that the tree is illustrative rather than complete: whether a primary-storage failure loses committed data depends on the replication and durability guarantees in force, so the assumptions must be stated before the tree means anything.](figures/fault-tree-confirmed-reservation-lost.svg)

The gates carry the argument. Each branch under an OR gate is an independent path to the top event and needs a control of its own. A branch under an AND gate names two defenses that must fail together, a far less likely proposition.

The tree is illustrative rather than complete, and the gap is the teaching opportunity. Whether a primary-storage failure actually loses committed data depends on the replication topology, the durability settings in force at commit, and whether the backup is a live replica or a snapshot someone must restore. Students must define those events and state the assumptions before the tree means anything at all. A second top event, *two conflicting reservations are confirmed*, reaches back to the previous unit's database invariant.

## Specifying recovery behavior

Neither analysis says what the application should do. Take the failure mode FMEA already named. A student submits a reservation, the database commits it, and the connection fails before the response returns. The student sees a timeout.

Did the reservation succeed? The timeout cannot answer. Repeating the request may create a second reservation unless the service can recognize that the new request represents the same intended action.

![The figure is divided into two horizontal bands. The upper band, labeled RESERVATION STATE and held by the server and database, begins with REQUEST RECEIVED, which transitions to PENDING. PENDING forks into two terminal reservation states: COMMITTED, the room is booked, on the left, and REJECTED, no booking was made, on the right. An arrow descends from COMMITTED across the band boundary into the lower band, labeled RESPONSE DELIVERY AND CLIENT KNOWLEDGE, reaching RESPONSE ATTEMPTED. RESPONSE ATTEMPTED forks two ways: DELIVERED, where the client knows the outcome, and LOST, drawn in the failure color, where no response arrives. LOST transitions to CLIENT UNCERTAIN, also in the failure color, which may retry the request. A dashed leader points from CLIENT UNCERTAIN to a note reading that the reservation is still COMMITTED in the band above and that a lost response undoes nothing. A footer reads that only the upper band records what happened, that every transition below leaves it unchanged, and that the server must therefore recognize a retry of an operation it has already committed.](figures/reservation-request-state-model.svg)

A state machine suits this question because it concerns permitted transitions rather than causes, and because it separates the reservation's state from the client's knowledge of it. **An idempotent operation** can be repeated without effects beyond those of the first successful execution. Here the application ties a stable request identifier to the intended operation and uses persistent state to recognize a repeat.

That is not yet a design. The engineer must specify how the identifier is assigned, how long it stays valid, and what happens when two requests carrying it arrive at once. Checking whether the identifier exists and then inserting the reservation is insufficient if the check and the insertion can race, because both requests can observe it absent. Two transitions also need specifying: a committed result must stay discoverable after a restart, and a reused identifier carrying different parameters must not return an unrelated result.

## Selecting mitigations

Mechanisms arrive last, as answers to failures the models have already identified.

| Mechanism | Purpose | Important limitation |
|---|---|---|
| Timeout | Bound how long an operation waits | Establishes nothing about whether it succeeded |
| Retry | Recover from a transient failure | Can duplicate work or deepen an overload |
| Idempotency | Make a repeated operation safe | Needs persistent coordination for consequential writes |
| Backpressure | Limit incoming or outstanding work | Rejects or delays requests by design |
| Circuit breaker | Stop calling a failing dependency | Does not repair the dependency |
| Recovery procedure | Restore acceptable operation | Requires evidence that invariants still hold |

A retry suits a network request that failed transiently; the same retry offered to a saturated service adds load to the condition that caused the failures. A timeout bounds waiting and leaves the outcome uncertain, which is what the state machine exists to resolve. Each choice improves one measurement and worsens another, which is why this table is of little use without the FMEA table in front of it.

## Obtaining evidence

A model is worth only the evidence that it holds, and each of the three produces a different claim.

| Model | Claim | Evidence |
|---|---|---|
| FMEA | The relevant failure modes are identified and addressed | Review, incident history, fault injection at named modes |
| Fault tree | The identified causal paths are controlled | Tests of basic events and of AND-gate combinations |
| State machine | Recovery transitions preserve the invariants | Transition tests, concurrent retries, crash and restart |

Fault injection makes a failure model testable: the engineer removes the database, drops the response, kills the process mid-transaction, and saturates the pool, then checks whether the behavior the model permits is the behavior that occurs. Functional tests establish behavior only under the conditions they exercise, which is why a system can pass its whole suite and still lose a confirmed reservation the first time a disk fails.

## Engineering judgment

Both lectures do the same thing with different models. Workload and capacity models support predictions about resource demand and response time. FMEA, fault trees, and state machines support reasoning about what can fail and what the system owes its users when it does.

They also interact in both directions. Additional capacity reduces overload-induced failures. Retries improve recovery from transient faults and increase offered load. Backpressure protects a service from collapse and accepts fewer requests immediately. A mechanism that improves one measurement often worsens another, so the two must be evaluated together rather than in sequence.

The next unit introduces a third source of behavior outside the specification: an adversary deliberately attempting to violate the system's obligations.
