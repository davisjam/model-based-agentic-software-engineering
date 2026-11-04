---
title: Performance & Reliability
sessions:
  - "Performance Engineering"
  - "Reliability Engineering"
readings:
  groups:
    - heading: Reasoning about capacity before measuring it
      items:
        - cite: lazowska1984
          locator: 'chapters 1, 3, and 5'
          annotation: 'Lazowska, Zahorjan, Graham and Sevcik, [*Quantitative System Performance: Computer System Analysis Using Queueing Network Models*](https://homes.cs.washington.edu/~lazowska/qsp/) (Prentice-Hall, 1984; the authors hold the copyright and make the full text freely available). Read chapter 1 for the overview, chapter 3 on the fundamental laws, and chapter 5 on bounds. The remaining chapters are reference material and are not assigned. Chapter 3 derives Little''s Law and the utilization law from quantities you can actually measure, and that derivation is the point to carry away: these are consistency relationships among measured averages, not predictions of how response time will rise with load. Chapter 5 then shows how a single saturated resource bounds the throughput of the whole system before any detailed model is built. The notation is heavier than this unit requires and the hardware examples date from the 1980s; read for the reasoning rather than the arithmetic.'
    - heading: What a service should do when asked for more than it can deliver
      items:
        - cite: beyer2016sre
          locator: 'chapter 21, Handling Overload'
          annotation: 'Beyer, Jones, Petoff and Murphy (eds.), *Site Reliability Engineering: How Google Runs Production Systems* (O''Reilly, 2016), [chapter 21, "Handling Overload"](https://sre.google/sre-book/handling-overload/). Read the whole chapter. It treats overload as a condition the service must be designed to survive rather than as an operational surprise, and it covers per-client throttling, request criticality, graceful degradation, and retry budgets. The retry budget is the idea to carry away: a retry policy that looks correct from one client can multiply the load arriving at a service that is already failing, which is the mechanism connecting this unit''s two lectures. [Chapter 22, "Addressing Cascading Failures"](https://sre.google/sre-book/addressing-cascading-failures/), is optional and extends the same argument. The book''s distributed-consensus chapters are out of scope here.'
instructor_materials: []
student_materials: []
assignments: []
instructor_notes: ""
status: draft
---

**Premise.** *Functional correctness does not establish that a system will behave acceptably under load or preserve its obligations when components fail. Engineers must model the workloads and failures the system will meet, decide what behavior is acceptable, and obtain evidence that the implementation delivers it.*

Our campus reservation service runs in a suitable environment, stores reservations durably, and has an architecture we can examine and change. Its API passes its functional tests. None of that establishes whether it can serve hundreds of students at once, or what it does when its database becomes unavailable.

Those are two different problems. Performance concerns the relationship between workload, resource consumption, and observable behavior. Reliability concerns whether the system keeps providing its required behavior over time, including when parts of it fail.

In both, the engineer decides which workloads and failures matter, what behavior is acceptable, and what evidence would settle whether the system provides it.

## Structure of this unit

**Lecture 1, Performance Engineering.** We build workload and capacity models for the service, define latency, throughput, and utilization, then use measurements and simple quantitative models to locate bottlenecks and compare interventions.

**Lecture 2, Reliability Engineering.** We analyze what can fail using failure mode and effects analysis, decompose one unacceptable outcome with a fault tree, specify recovery behavior as a state machine, and only then select mitigations and the evidence justifying them.

Both follow the Act III method: identify the problem, model what matters, exercise judgment about realization, and obtain evidence.

## Performance engineering

Three measurements organize the subject. **Latency** is the elapsed time to complete one operation. **Throughput** is completed work per unit time. **Utilization** is the fraction of a resource's capacity that is occupied.

None substitutes for another. A service can complete many requests per second while a tenth of its users wait unacceptably long, because an average conceals its distribution.

## Characterizing workload and capacity

A performance requirement is meaningful only relative to a workload. The reservation service may be adequate when ten students browse rooms on an ordinary afternoon and unusable when four hundred try to book in the first minutes of registration.

| Workload property | Engineering question | Reservation example |
|---|---|---|
| Request rate | How often does work arrive? | Reservations per second |
| Operation mix | What kinds of work arrive? | Searches, bookings, cancellations |
| Concurrency | How much work overlaps? | Simultaneously active requests |
| Service demand | What does each operation consume? | Database queries, CPU time |
| Variation | How does demand change over time? | Registration bursts |

A workload model is a purposeful reduction, not a transcript of user behavior. A workload made mostly of searches demands different database work than one made mostly of writes, so equal request rates can produce very different response times.

**Little's Law** relates three of these quantities. For a stable system, over a period in which arrivals and completions balance, `L = λW`: the average number of requests in the system equals the average completion rate multiplied by the average time each spends there. At 100 requests per second and a mean response time of 0.2 seconds, 20 requests are in the system. It holds under remarkably general conditions, which makes it a useful consistency check on measurements. It is not a capacity model: it neither identifies the bottleneck nor predicts response time from capacity, because `W` is a measured input rather than something it derives.

**The M/M/1 model** predicts what Little's Law cannot, under assumptions that deserve equal prominence with its results: one server, Poisson arrivals, exponentially distributed service times, and a stable queue with arrival rate λ below service rate μ. Mean time in the system is then `W = 1/(μ − λ)`, or `(1/μ)/(1 − ρ)` at utilization `ρ = λ/μ`. At 50% utilization that is twice the unloaded service time; at 90%, ten times; at 99%, one hundred times.

The result to carry away is not the formula but what it demonstrates: a resource can have ample average capacity while having almost none left to absorb variation. Random bursts create queues even when average arrivals stay below capacity, and higher utilization means longer drains. Strictly, the curve has no mathematically distinguished knee. Response time diverges as utilization approaches 100%, and the engineer picks an operational threshold from the latency requirement and the workload's variability. Real systems need not satisfy the four assumptions, and a model applied outside them predicts confidently and wrongly.

<!-- PLACEHOLDER: the interactive queueing simulator for this passage is being built separately and
     now exists on disk at course/interactive/performance-knee/index.html, but it is still in flight
     (its page currently fails the html-validate gate) and its PUBLISHED url shape is not settled.
     Link it here once that page is landed and its served path is known. Do NOT guess the url: a
     reference to a path the site does not serve fails the link-resolution gate. -->

## Finding bottlenecks

Several components do work to satisfy one reservation request. An HTTP handler validates the input, application logic evaluates the booking rules, and the database reads and writes shared state.

![Two columns run down the figure, aligned row by row. The left column, headed REQUEST PATH, begins with an HTTP REQUEST pill and flows down through three stages: an HTTP HANDLER that validates the input, BOOKING LOGIC that evaluates the reservation rules, and a DATABASE that reads and writes the shared reservation state; a final arrow reaches a RESPONSE pill. The right column, headed RESOURCE DEMANDED, names what each stage consumes, row for row. Beside the HTTP handler: application CPU, for parsing and validation. Beside the booking logic: application CPU, for rule evaluation. Beside the database, drawn in the qualifying color: database CPU and disk input/output, plus waiting for a connection from the pool, for row locks, and for queries already queued ahead of this one. A footer reads that adding application CPU cannot reduce the time a request spends waiting on the database, and that the engineer measures where the time goes before choosing where to add capacity. A closing italic note reads that waiting is not computing: a saturated connection pool consumes elapsed time without consuming CPU.](figures/request-path-and-resource-demand.svg)

Adding application replicas will not reduce response time if requests spend most of their elapsed time waiting for the database. Adding database capacity may accomplish little if an inefficient access pattern issues unnecessary queries. So the engineer measures where the time goes before choosing where to spend. Profiling attributes time inside one process; traces attribute it across components; execution plans expose the work a query performs.

A bottleneck is not simply the busiest resource. It is the constraint whose relief would do most to raise useful throughput, or bring response times back within bounds, for the workload under consideration. Relieving it usually moves the constraint elsewhere, so every intervention earns a fresh measurement.

## Exercise A: Improving reservation performance

The service meets its functional specification and becomes slow during registration. Application CPU utilization is moderate, the connection pool is saturated, and requests spend substantial time waiting to execute queries. Students compare three interventions.

| Intervention | Expected benefit | What must be checked |
|---|---|---|
| Add application replicas | More application processing capacity | Whether the database remains the constraint |
| Optimize database access | Less database work per request | Query plans and measured latency |
| Increase database capacity | More capacity for database operations | Whether contention still limits throughput |

The choice follows from the workload model and the measurements, not from the observation that the service is slow. The exercise then asks what evidence would justify it: throughput under a representative workload, a latency distribution rather than a mean, utilization at each stage, and behavior near capacity.

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

The tree is illustrative rather than complete, and the gap is the teaching opportunity. Whether a primary-storage failure actually loses committed data depends on the replication topology, the durability settings in force at commit, and whether the backup is a live replica or a snapshot someone must restore. Students must define those events and state the assumptions before the tree means anything. A second top event, *two conflicting reservations are confirmed*, reaches back to the database invariant of the previous unit and gives them a tree to build.

## Specifying recovery behavior

Neither analysis says what the application should do. Take the failure mode FMEA already named. A student submits a reservation, the database commits it, and the connection fails before the response returns. The student sees a timeout.

Did the reservation succeed? The timeout cannot answer. Repeating the request may create a second reservation unless the service can recognize that the new request represents the same intended action.

![The figure is divided into two horizontal bands. The upper band, labeled RESERVATION STATE and held by the server and database, begins with REQUEST RECEIVED, which transitions to PENDING. PENDING forks into two terminal reservation states: COMMITTED, the room is booked, on the left, and REJECTED, no booking was made, on the right. An arrow descends from COMMITTED across the band boundary into the lower band, labeled RESPONSE DELIVERY AND CLIENT KNOWLEDGE, reaching RESPONSE ATTEMPTED. RESPONSE ATTEMPTED forks two ways: DELIVERED, where the client knows the outcome, and LOST, drawn in the failure color, where no response arrives. LOST transitions to CLIENT UNCERTAIN, also in the failure color, which may retry the request. A dashed leader points from CLIENT UNCERTAIN to a note reading that the reservation is still COMMITTED in the band above and that a lost response undoes nothing. A footer reads that only the upper band records what happened, that every transition below leaves it unchanged, and that the server must therefore recognize a retry of an operation it has already committed.](figures/reservation-request-state-model.svg)

A state machine suits this question because it concerns permitted transitions rather than causes, and because it separates the reservation's state from the client's knowledge of it. **An idempotent operation** can be repeated without effects beyond those of the first successful execution. Here the application ties a stable request identifier to the intended operation and uses persistent state to recognize a repeat.

That is not yet a design. The engineer must specify how the identifier is assigned, how long it stays valid, and what happens when two requests carrying it arrive at once. Checking whether the identifier exists and then inserting the reservation is insufficient if the check and the insertion can race, because both requests can observe it absent. Two transitions also need specifying: a committed result must stay discoverable after a restart, and reusing an identifier with different parameters must not silently return an unrelated result.

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

A retry suits a network request that failed transiently, and the same retry offered to a saturated service adds load to the condition that caused the original failures. A timeout bounds waiting and leaves the outcome uncertain, which is what the state machine exists to resolve. Each choice improves one measurement and worsens another, which is why this table is of little use without the FMEA table in front of it.

## Exercise B: A reservation that may already exist

The database commits a reservation, the HTTP response is lost, and the client times out and submits the same request again. Students answer four questions.

1. What does the client know after the timeout?
2. Which property of the system must remain invariant?
3. What information would allow the server to recognize a retry?
4. What evidence would establish that the implementation handles concurrent duplicate requests correctly?

The intended solution separates the identity of the requested operation from that of the resulting reservation. A persistent idempotency record, coordinated atomically with the reservation outcome, lets a repeated request return the original result instead of creating a second booking.

## Obtaining evidence

A model is worth only the evidence that it holds, and each of the three produces a different claim.

| Model | Claim | Evidence |
|---|---|---|
| FMEA | The relevant failure modes are identified and addressed | Review, incident history, fault injection at named modes |
| Fault tree | The identified causal paths are controlled | Tests of basic events and of AND-gate combinations |
| State machine | Recovery transitions preserve the invariants | Transition tests, concurrent retries, crash and restart |

Fault injection makes a failure model testable: the engineer removes the database, drops the response, kills the process mid-transaction, and saturates the connection pool, then checks whether the behavior the model permits is the behavior that occurs. Functional tests establish selected behavior under the conditions they exercise and nothing outside them, which is why a system can pass its whole suite and still lose a confirmed reservation the first time a disk fails.

## Engineering judgment

Both lectures do the same thing with different models. Workload and capacity models support predictions about resource demand and response time. FMEA, fault trees, and state machines support reasoning about what can fail and what the system owes its users when it does.

They also interact in both directions. Additional capacity reduces overload-induced failures. Retries improve recovery from transient faults and increase offered load. Backpressure protects a service from collapse and reduces the fraction of requests accepted immediately. A mechanism that improves one measurement often worsens another, so the two must be evaluated together rather than in sequence.

The next unit introduces a third source of behavior outside the specification: an adversary deliberately attempting to violate the system's obligations.
