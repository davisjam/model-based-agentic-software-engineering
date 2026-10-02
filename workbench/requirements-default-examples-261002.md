Yes. I would make the examples themselves a small conformance suite for the MAGE thesis: every example contains multiple purposeful models over shared entities, and the interesting questions require either choosing the right model or composing models. They should not merely be attractive sample diagrams.

DEFAULT-MODEL-SYSTEMS.md

Pre-canned model systems for the MAGE Workbench

1. Purpose

MAGE SHALL ship with three default model systems that can be loaded directly from the empty workbench.

The examples serve four purposes:

1. Give a new user something meaningful to inspect and manipulate immediately.
2. Demonstrate that a software system is usefully represented by multiple purposeful models, not one comprehensive diagram.
3. Exercise different portions of the MAGE semantic, query, analysis, visualization, and agent interfaces.
4. Provide stable end-to-end examples for testing the workbench itself.

The three systems are:

Example	Primary ideas	Main analysis
Message Bus	typed relations, shared identity, cross-model composition	safety / information flow
Document Processing	behavioral + quantitative views of same workflow	performance / resource requirements
Worker Queue	state machines, bounded cycles, multiple behavioral models	safety + liveness

Each SHALL contain at least two distinct linked purposeful models.

The models must share semantic identities where appropriate. They SHALL NOT merely be unrelated diagrams packaged in one example.

⸻

2. Common requirements

Every example SHALL include:

* 2–4 purposeful models;
* shared entities across at least two models;
* an explicit engineering question for each model;
* at least one question answerable from a single model;
* at least one question requiring composition of two models;
* at least one requirement;
* notes explaining important modeling choices;
* provenance identifying the example as MAGE-provided;
* 3–5 suggested questions;
* at least one useful modification the user can make;
* deterministic expected results for its supplied queries.

Across the complete set, the examples SHALL exercise:

* structural models;
* state machines;
* quantitative annotations;
* typed relationships;
* cross-model identity;
* graph reachability;
* safety;
* liveness/reachability;
* bounded cycles;
* performance;
* requirements;
* witnesses/counterexamples;
* model composition;
* purposeful omission / not-answerable.

The examples are therefore intentionally complementary.

⸻

3. Loading examples

The empty workbench SHALL prominently offer:

Create New Model System
Load Example
  Message Bus
  Document Processing
  Worker Queue
Import...

Selecting an example SHALL show a short description before or as it loads:

Message Bus
Explore an event-driven order system using linked
communication and data-policy models.
Models
• Event Flow
• Data Policy
Try asking
• Which consumers can receive OrderCreated?
• Can restricted data reach Analytics?
• What changes if Analytics subscribes to PaymentCompleted?
                         Load Example

Loading creates an ordinary editable workspace.

There is no special example execution mode.

⸻

4. Example 1: Message Bus

4.1 Purpose

This is the simplest example conceptually.

Its central lesson is:

Relations have semantics, and different purposeful models can be joined through shared identity to answer a stronger question.

It should particularly demonstrate that event-driven architecture cannot be reduced to an ordinary call graph.

4.2 System

Use a small order-processing system:

                        OrderCreated
                       /      |      \
                      /       |       \
                     ▼        ▼        ▼
Checkout          Billing  Inventory  Analytics
Billing
   │ publishes
   ▼
PaymentCompleted
   │
   ▼
Fulfillment

These are conceptual entities; the rendered event-flow model should clearly distinguish services and event topics/types.

4.3 Model A: Event Flow

Question: Which events may reach which consumers?

Represent:

* producers;
* events/topics;
* consumers;
* publishes;
* subscribes.

For example:

Checkout  --publishes--> OrderCreated
Billing   --subscribes--> OrderCreated
Inventory --subscribes--> OrderCreated
Analytics --subscribes--> OrderCreated
Billing     --publishes--> PaymentCompleted
Fulfillment --subscribes--> PaymentCompleted

The relation semantics SHALL distinguish:

publishes
subscribes
calls

These are not interchangeable edges.

Single-model queries

* What publishes OrderCreated?
* Which services subscribe to OrderCreated?
* Can an event originating at Checkout eventually cause an event to reach Fulfillment?
* What event paths connect Checkout and Fulfillment?

The final question may use derived event-flow semantics defined by MAGE.

4.4 Model B: Data Policy

Question: Which data may each service process?

The same event and service identities appear here.

Example facts:

OrderCreated
  contains:
    customer-id       INTERNAL
    shipping-address  RESTRICTED
    product-id        PUBLIC
PaymentCompleted
  contains:
    customer-id       INTERNAL
    payment-status    INTERNAL
Billing       permits RESTRICTED
Inventory     permits RESTRICTED
Analytics     permits INTERNAL
Fulfillment   permits RESTRICTED

The exact classification vocabulary can remain deliberately small:

PUBLIC < INTERNAL < RESTRICTED

4.5 Cross-model question

Can an event containing restricted data reach a service not permitted to process restricted data?

Neither model alone answers this.

Event Flow provides:

event → subscriber

Data Policy provides:

event → contained classifications
service → permitted classification

Shared identities permit the join.

The supplied system should contain one visible violation, for example Analytics subscribing to OrderCreated.

MAGE returns a counterexample/witness:

OrderCreated
  contains shipping-address [RESTRICTED]
        ↓ subscribed by
Analytics
  permits ≤ INTERNAL

The canvas should highlight the corresponding elements across both models.

4.6 User modification

Suggested task:

Remove Analytics from OrderCreated and introduce an OrderSummary event containing only public/internal fields.

The user creates the event and relations. Re-running the safety query should show that the previous counterexample disappears.

This exercises construction, typed relationships, editing, cross-model queries, evidence and requirements.

4.7 Teaching emphasis

Primary: relation semantics and composition.

Secondary: safety.

No complicated state-machine behavior is needed. Keep this example graph-centric.

⸻

5. Example 2: Document Processing

5.1 Purpose

This example demonstrates that the same system can require a behavioral model and a quantitative model because different engineering questions preserve different distinctions.

Its main lesson is:

A model useful for reasoning about workflow is not necessarily useful for reasoning about performance.

This should be the principal performance example.

5.2 System

A simplified document-remediation pipeline:

Upload
  ↓
Parse
  ↓
Remediate ──→ Model Gateway
  ↓
Validate
  ↓
Publish

There may also be object storage and a cache if useful, but do not reproduce DocAble’s production architecture.

5.3 Model A: Document Lifecycle

Question: What states can a document enter, and what must occur before publication?

Example:

uploaded
   ↓
parsing
   ↓
remediating
   ↓
validating ───failed──→ waiting
   ↓                    │
published               └──retry──→ remediating

Include:

retry_count:
  type: integer
  range: [0, 3]

Useful safety query:

Can a document be published without reaching validating?

Useful behavioral query:

Can processing continue retrying indefinitely?

The bounded retry counter means the model can establish the relevant bound.

5.4 Model B: Performance Model

Question: Does document processing satisfy the modeled latency and memory requirements?

Attach quantities to shared states/transitions/components.

For example:

Parse                50 ms
Remediate            100 ms
Model Gateway        100–500 ms
Validate             75 ms
Remediation memory   256 MB
Gateway cache        128 MB

Requirements:

normal processing latency ≤ 750 ms
peak memory ≤ 512 MB

The performance model references the same operations/entities represented in the lifecycle model.

5.5 Cross-model question

What is the maximum modeled latency of a document that eventually publishes, including permitted retries?

The lifecycle model supplies possible executions.

The performance model supplies costs.

Neither alone is sufficient.

MAGE combines:

behavioral trace
       +
transition/component quantities
       ↓
path quantity

and reports both result and evidence.

For example:

Maximum modeled latency: 1,425 ms
Requirement: ≤ 750 ms
Status: counterexample found
Trace:
uploaded
→ parsing
→ remediating
→ failed
→ waiting
→ remediating
→ validating
→ published
Bound:
retry_count ∈ [0,3]

Numbers should be chosen so expected answers are simple and deterministic.

5.6 Cache what-if

This is the natural example for the hypothesis workflow.

Suggested question:

Add a 128 MB cache before Model Gateway with an 80% hit rate. Does it improve expected latency without violating the memory requirement?

Agent or human creates a hypothesis.

This introduces:

* quantitative annotation;
* ratio/probability;
* expected latency;
* memory;
* requirement evaluation;
* what-if comparison.

If hit rate is omitted, the expected-latency query SHALL return:

Not answerable. The model represents hit and miss costs but deliberately omits their frequencies.

This is the flagship example of purposeful omission applied to quantitative reasoning.

5.7 Teaching emphasis

Primary: performance and resource reasoning.

Secondary: behavior supplies the execution structure over which quantities are evaluated.

This example should make the distinction between configuration properties and path properties concrete:

memory   → configurations
latency  → execution paths

⸻

6. Example 3: Worker Queue

6.1 Purpose

This is the strongest behavioral example.

It should demonstrate linked state machines and distinguish safety from liveness.

Central lesson:

“Nothing bad happens” and “something good eventually happens” are different engineering questions and may require different modeled distinctions.

6.2 System

A small queue with a worker and lease/ownership mechanism:

        Queue
          │
          ▼
        Worker
       /      \
    success   failure
      │          │
      ▼          ▼
   complete    retry

A lease prevents simultaneous ownership.

Keep concurrency finite and explicit. We do not need arbitrary worker multiplicity.

Use two workers if needed:

worker-0
worker-1

with a finite lock/lease state.

6.3 Model A: Job Lifecycle

Question: Can every accepted job eventually reach a terminal state under the modeled retry policy?

Example states:

queued
  ↓
claimed
  ↓
processing
  ├──→ completed
  │
  └──→ failed
          │
          ├── retry_count < 3 → queued
          │
          └── retry_count = 3 → dead_letter

Terminal states:

completed
dead_letter

Queries:

* Can completed be reached?
* Can dead_letter be reached?
* Can the job retry forever?
* Is every execution bounded by the retry policy?

This is the liveness/progress-oriented model.

Strict infinite-trace temporal logic need not be introduced. The finite bounded model can answer the useful engineering questions we actually support.

6.4 Model B: Lease / Ownership

Question: Can two workers simultaneously own the same job?

Represent lease state explicitly:

free
  ├── claim(worker-0) → held-by-0
  └── claim(worker-1) → held-by-1
held-by-0
  └── release → free
held-by-1
  └── release → free

This deliberately avoids a general reference-valued variable or arbitrary worker multiplicity.

Safety requirement:

At most one worker owns the job at any time.

This model should make the property trivially expressible and exhaustively checkable.

6.5 Linking the models

The two models share:

* job identity;
* worker identity;
* claim/release events or corresponding transitions.

For example, transition into claimed in the job lifecycle corresponds to acquisition of the lease.

This creates the stronger cross-model question:

Can a job be in processing without some worker holding its lease?

Now:

Job Lifecycle
    processing
         +
Lease Model
    free / held-by-N
         ↓
cross-model safety property

A deliberately introduced faulty transition can provide a counterexample, or the initial model can satisfy the invariant and a suggested modification can break it.

6.6 Safety versus liveness

This example should explicitly contain both:

Safety

Never:
two workers own one job

and:

Progress/liveness-like property

Under the modeled bounded retry policy:
a job cannot remain in retry indefinitely

MAGE should be precise about what it establishes. If it exhaustively explores a finite transition system and shows all reachable executions terminate, say that. Do not claim support for arbitrary temporal liveness verification if we have not implemented it.

6.7 Suggested modification

Add a transition that allows processing to begin before lease acquisition.

The safety query should produce a counterexample.

Then:

Repair the model so processing requires lease ownership.

Re-run the query and establish the property.

This is a particularly good example for agent-assisted modeling because the agent can propose the repair as a hypothesis and the student can inspect the resulting trace/property.

6.8 Teaching emphasis

Primary: safety versus progress/liveness, state machines, cross-model behavioral composition.

Secondary: bounded state spaces and counterexamples.

Keep performance out of this example except perhaps a trivial quantity. Document Processing already teaches performance.

⸻

7. Purposeful omissions

Each example SHALL deliberately omit some plausible information.

This is important. A “complete-looking” example would teach the wrong lesson.

Message Bus

Represent:

event publication/subscription
data classification

Omit:

runtime delivery observations
delivery latency
ordering guarantees

Therefore:

“Did Analytics actually receive this event at 2:04 PM?”

is not answerable.

Document Processing

Represent:

workflow
selected latency/memory quantities

Omit, initially:

cache hit frequency

Therefore expected cache latency is not answerable until hit rate is modeled.

Worker Queue

Represent:

job lifecycle
lease ownership
bounded retries

Omit:

scheduler fairness
real wall-clock scheduling
arbitrary worker population

Therefore a question requiring fairness should be refused rather than answered by pretending the finite state machine contains that distinction.

⸻

8. Notes and provenance

Each model SHALL include a short rationale note.

For example:

notes:
  - kind: rationale
    text: >
      This model represents permitted event flow rather than
      observed runtime delivery. It therefore supports architectural
      reachability questions but not claims about whether a message
      was actually delivered.

This is valuable because the examples teach not only what was modeled but why.

The system itself should contain provenance:

provenance:
  origin: mage-example
  example: message-bus
  version: 1

Once loaded, user modifications proceed normally.

⸻

9. Suggested questions are executable artifacts

Suggested questions should not merely be instructional strings.

Where a question has a deterministic formal interpretation, ship:

suggested_queries:
  - id: restricted-data-to-analytics
    label: Can restricted data reach Analytics?
    question: >
      Can an event containing restricted data reach Analytics?
    models:
      - event-flow
      - data-policy

The UI presents the natural-language label.

The underlying example package can also contain the expected formal query/analysis request and expected result for regression testing.

This makes the examples executable documentation.

⸻

10. Expected-result fixtures

Every supplied query SHALL have a fixture used in CI.

For example:

expected:
  status: counterexample-found
  evidence:
    includes:
      - event: OrderCreated
      - field: shipping-address
      - service: Analytics

Do not over-specify incidental ordering or generated IDs where unnecessary.

The fixture tests semantic outcome, not rendering coordinates.

⸻

11. Human UX requirements

For every example, a human SHALL be able to:

1. load it;
2. switch among its models;
3. select a shared entity and see its appearances in other models;
4. inspect model purpose, notes, represents, and omits;
5. execute suggested queries without writing SPARQL;
6. inspect graphical and textual evidence;
7. modify the model using ordinary UI affordances;
8. re-run queries;
9. undo modifications;
10. export the resulting ordinary MAGE workspace.

The examples SHALL therefore exercise the HUMAN-UX specification rather than bypass it.

⸻

12. Agent requirements

The same operations SHALL be available through window.mage.

For example:

examples()
loadExample("message-bus")
models()
query(...)
hypothesize(...)
commit(...)

After loadExample, the agent sees an ordinary workspace. There is no example-specific API for editing or querying it.

This follows UX-I1 semantic affordance parity.

⸻

13. Example equivalence invariant

Add:

EX-I1 — Example equivalence

After loading, a MAGE-provided example SHALL have the same semantic status and support the same operations as an equivalent model system created by a user or agent.

No privileged query paths, renderers, validators, or analysis code.

⸻

14. Multi-model invariant

And this should probably be the defining invariant of the examples:

EX-I2 — Purposeful model plurality

Every default example SHALL contain at least two semantically distinct purposeful models over at least one shared identity, and SHALL include at least one supplied engineering question whose answer requires information from more than one of those models.

That prevents someone later “simplifying” an example into one giant graph.

⸻

15. Analysis diversity invariant

I would add one more:

EX-I3 — Analysis diversity

The default example set SHALL collectively demonstrate structural composition, safety reasoning, progress/liveness reasoning, quantitative performance reasoning, and purposeful non-answerability.

This gives us a reason for exactly these three examples.

⸻

16. System-model coverage

The examples themselves should appear in system-models/ coverage.

Something like:

                     DEFAULT EXAMPLES
             Message       Document       Worker
               Bus        Processing       Queue
                │              │             │
Relations       ●              ●             ●
Composition     ●              ●             ●
Safety          ●                            ●
Liveness                                      ●
Performance                    ●
Quantities                     ●
State machine                  ●             ●
Not-answerable  ●              ●             ●

This need not literally be a matrix in implementation. The important part is that the model permits the question:

Does the shipped example suite exercise every major public semantic capability of MAGE?

That gives us another dogfooded engineering model rather than a manually maintained feature checklist.

⸻

17. Files and organization

I would package them approximately as:

examples/
  message-bus/
    system.mage.yaml
    expected-results.yaml
  document-processing/
    system.mage.yaml
    expected-results.yaml
  worker-queue/
    system.mage.yaml
    expected-results.yaml

The built site can bundle these assets statically.

And in system-models/:

system-models/
  ...
  interface-affordances.mage.yaml
  example-coverage.mage.yaml

Ideally example-coverage is generated or checked against metadata in the actual examples rather than manually drifting.

⸻

18. The progression

The examples should appear in this order because they form a coherent conceptual progression:

Message Bus: What do the relations mean?

A model is not “boxes and arrows.” publishes, subscribes, classification, and permission preserve different facts. Compose them and we can establish a safety property.

Document Processing: What happens when behavior acquires quantities?

A lifecycle tells us possible executions. A performance model assigns quantities to parts of those executions. Compose them and we can ask consequential performance questions. Omit hit rate and expectation becomes unanswerable.

Worker Queue: What can we establish about behavior itself?

Multiple state models capture different aspects of the same execution. Compose lifecycle with ownership and we can establish safety, find counterexamples, and reason about bounded progress.

So these aren’t merely three nice demos. Together they demonstrate the intellectual architecture of MAGE:

\boxed{\text{Question} \rightarrow \text{Purposeful Models} \rightarrow \text{Composition} \rightarrow \text{Evidence}}

while making clear that different questions require different models, and no model earns the right to answer a question merely because it depicts the same software system.
