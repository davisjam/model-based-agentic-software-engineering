# MAGE Workbench v0.2 — Built-In Examples and Semantic Completion

> **Author's specification, 261004, landed verbatim below the line.** Baseline `5d30c275`.
>
> **It rules the two questions that were open.** §4.1 and §23 settle the binding/composition
> vocabulary: there is **no generic semantic join** — *"we've now discovered that join was hiding two
> different things"* — so `join` ceases to be an authoritative semantic category, and `combineWith`,
> if retained, is Learn-page pedagogy only. §20's release gate makes it checkable: *"No semantic use
> of overloaded join remains."* That is the fuller rename, not the student-facing-only reading I had
> defaulted to. And the three-vs-four flagship tension is superseded: the built-in set is **five**,
> named and ordered, with Worker Queue not among them.
>
> **Two corrections it makes to work landed earlier today.** (1) The conformance evidence
> classification is three-way — `oracle-executed` / `normative-artifact` / `spec-inspected` — because
> OMG publishes normative *machine-readable* KerML and SysML artifacts; checking against those is
> stronger than reading prose and needs no runtime dependency. The in-flight fixtures wave was
> corrected mid-run. (2) `unlicensed` and `exhausted` must not masquerade as truth values: §5.4 wants
> an explicit `status` / `verdict` split, which goes further than the status-negation fix landed
> today.
>
> **Status of its implementation order (§3, §19).** Steps 5 and 6 — the temporal kernel and the LTL
> half of quantitative semantics — are substantially **already landed**: LTL has defined trace
> semantics, stuttering terminal behaviour, the no-fairness rule, lasso counterexamples, and a pinned
> P1–P5 suite. Wave 2's exit criterion (*"Transaction Protocol Q1–Q6 are executable and
> test-pinned"*) is closer than the ordering implies. Waves 1 (semantic closure) and 4 (conformance
> corpus) are the live frontier.
>
> **One tension to flag rather than bury.** §7.1 requires quantity operations `value, sum, min, max,
> mean, count`. The shipped quantity forms are `latency`, `cost`, `peak_memory` with the aggregation
> fixed by the form — *"a target selects WHICH executions, never how they aggregate"*
> (`DESIGN-v02-quantification-261004.md`). Whether §7.1 asks for user-selectable aggregation
> operators, or merely for those semantics to exist, changes the work materially. Unresolved here.

---

Yes. I dropped that thread when I reduced the Learn-page guidance to the three semantic exemplars. We had already converged on perhaps five built-in examples, each with richer questions/activities, including an embedded memory example. The SysML/KerML decision actually makes that design better.

I would make the five examples the spine of the bottom half of Learn, rather than merely “Try the examples.”

Proposed built-in set

Example	Models	What students learn	Representative questions
Secure Message Bus	Structure + Behavior	reachability, information flow, bindings, safety	Can restricted data reach an impermitted subscriber? What path witnesses it? Can delivery occur before authorization?
Transaction Protocol	Structure + Behavior	lifecycle, LTL, safety/liveness, counterexamples	Can a stale transaction commit? Does every proposal eventually commit or refuse? Can a disposed hypothesis become authoritative?
Embedded Sensor Node	Structure + Quantity + Behavior	memory/resource budgets, configurations, margins	What is peak SRAM? Does every operating mode fit in 256 KiB? What dominates memory? What happens if queue depth doubles?
Processing Pipeline	Behavior + Quantity	executions, latency/cost, behavioral selection	What is worst-case successful latency? Which stage dominates? Are all successful executions under the requirement?
Autonomous Delivery System	Structure + Behavior + Quantity	integrated reasoning across all three forms	Can the controller command an unsafe action? Does every mission terminate? Can the safe behaviors meet the energy budget?

The fifth should be deliberately more complex. It is the capstone showing that these aren’t three unrelated modeling toys.

Each example should be an activity, not a finished demo

I’d give every example 4–6 curated questions and 2–3 modifications. The page should invite students to answer a question before displaying the Workbench result.

For example, Embedded Sensor Node could open with a visual showing MCU, radio, sensor, buffers, inference model, and task/operating modes. Give it a 256 KiB SRAM budget.

Then questions progress:

1. Inspect: What consumes the most SRAM?
2. Calculate: What is peak SRAM consumption in sensing mode?
3. Check: Can every modeled operating mode fit within 256 KiB?
4. Explain: If not, which allocations produce the violation?
5. Modify: Double the radio queue depth. Which pinned property changes?
6. Design: Reduce memory use enough to restore a 20% margin. What change would you make?

That last one is important: the Workbench shouldn’t only ask students to execute canned queries. They should change the engineering model to satisfy an objective.

Then a richer extension can bring in Behavior:

The inference buffer and transmit buffer are not simultaneously live. Does modeling the lifecycle reduce the required peak-memory estimate?

Now adding a behavioral model isn’t arbitrary. It gives the quantity model information it previously lacked.

That is an excellent demonstration of purposeful modeling.

Secure Message Bus

Start with the structural model and ask:

1. Which services receive TelemetryEvent?
2. Can data from the external publisher reach Analytics?
3. Can restricted data reach a service not permitted to process it?
4. Show the witness path if so.
5. Remove or redirect one relationship to satisfy the security requirement.

Then introduce behavior:

The structural model says a message can reach the service. Can it do so before authorization succeeds?

Now they need the behavioral model and perhaps an LTL safety property.

Modification:

Add a new subscriber for debugging. Which existing properties fail?

That’s exactly the model-change → property-change loop.

Transaction Protocol

This should be the main LTL tutorial.

Start easy:

1. Can Committed be reached?
2. Can Refused be reached?
3. Can a transaction commit without entering Valid?

Then temporal:

4. Does every proposal eventually commit or refuse?
5. Once refused, can a transaction later commit?
6. Find the counterexample if either property fails.

Activities:

Add a retry transition from Refused → Proposed. Which properties change?

Then:

Rewrite any property whose intended meaning has changed rather than simply forcing it green.

That’s a useful engineering lesson too.

Processing Pipeline

This is where behavior→quantity composition becomes unavoidable rather than ceremonial.

Questions:

1. What is the cheapest possible execution?
2. What is the worst-case latency?
3. Which stage contributes most to that latency?
4. What is the worst-case latency among successful executions?
5. Do all successful executions satisfy the 2-second requirement?
6. What changes if validation retries once?

Then:

Improve the model so the latency requirement is satisfied without removing validation.

Again, engineering rather than query trivia.

Autonomous Delivery System

This should be the “now use everything” example.

Something small enough to comprehend:

Planner → Controller → Drive
              ↓
            Safety
Battery / energy model
Mission:
Idle → Planning → Driving → Delivered
                    ↘ Fault

Questions could deliberately cross semantic boundaries:

1. Structure: Which components can issue commands to the drive subsystem?
2. Behavior: Can motion occur while the system is in Fault?
3. LTL: Does every accepted mission eventually reach Delivered or Aborted?
4. Quantity: What is the maximum energy consumption of a mission?
5. Composition: Among executions satisfying the safety properties, which exceed the energy budget?
6. Integrated design: Add a recovery behavior without violating either the safety or energy requirements.

That sixth question is where the Workbench starts feeling like an engineering environment rather than a model viewer.

Learn should therefore have two layers

The upper half teaches the concepts as I described previously:

Structure → Behavior → Quantity → Bindings → Composition → Queries → Properties → Requirements.

Then the lower half becomes:

Practice with complete systems

Five cards, ordered approximately by conceptual progression:

Secure Message Bus → Transaction Protocol → Embedded Sensor Node → Processing Pipeline → Autonomous Delivery

Each card should show:

* the visual model(s);
* Questions you can answer now;
* Try changing…;
* Add another model to answer…;
* a button opening that exact workspace.

That last distinction is particularly useful. For example:

You can answer now: Does every allocation fit in 256 KiB?
You cannot answer yet: Are these buffers simultaneously live?
Add: Behavioral model of operating modes.

Now the Learn page actually teaches why another model type is earned.

And this gives us a nice consistent activity pattern across all five:

Predict → Query → Inspect evidence → Modify → Recheck → Add a model when the existing one cannot answer the next question.

That’s substantially stronger than the three examples I proposed in the previous response, and it recovers the richer built-in-example direction we’d already chosen.

====

Below is the spec I would hand to the Workbench agent. I have treated 5d30c275 as the baseline: provenance infrastructure exists but is asserted rather than checked; bindings/compositions and requirement/verification are the two remaining structural dependencies; the examples are downstream consumers of those semantics rather than excuses to add ad hoc behavior.

MAGE Workbench v0.2: Built-In Examples and Semantic Completion

1. Purpose

Workbench v0.2 should ship with five built-in engineering examples that teach the semantic modeling regime by use.

The examples are not sample files demonstrating syntax. Each is a small engineering problem with questions that can be answered from its models, properties that can be preserved across changes, and modifications that cause students to discover why another model or semantic operation is needed.

The five examples are:

1. Secure Message Bus
2. Transaction Protocol
3. Embedded Sensor Node
4. Processing Pipeline
5. Autonomous Delivery System

Together they must exercise the v0.2 semantic surface:

* structural models
* behavioral models
* quantitative models
* bindings
* cross-model composition
* queries
* witnesses
* counterexamples
* pinned properties
* requirements
* verification
* LTL
* quantities and units
* purposeful omission
* human and agent access to the same semantic operations

They should also function as acceptance tests for the semantic design. If an activity cannot be expressed cleanly using registered semantics, do not special-case the example. Either the semantic operation belongs in v0.2 and must be designed explicitly, or the activity must wait.

⸻

2. Baseline at 5d30c275

Do not redo work that has already landed.

The SysML/KerML provenance decision is already §35 of the v0.2 specification and is registered as a V-rule.

The governing decision is:

Implement the educational subset natively. Treat the OMG SysML v2 and KerML specifications as normative semantic sources and the Pilot Implementation as a reference oracle. Take no runtime dependency on an external SysML/KerML implementation.

The corresponding durable rule is:

Borrowed semantics must have provenance. Extensions must be identified as extensions rather than attributed to SysML/KerML.

semanticBasis is required by the compiler. There are currently 11 declarations:

* 3 borrowed
* 5 extension
* 3 extension-grounded

This is useful and should remain structurally mandatory.

However, do not describe the implementation as conformant.

The current honest status is:

Attribution is structurally present but semantically asserted. Zero conformance fixtures exist.

Five mappings currently owe fixtures. Three correspond to constructs already represented in the registry. Two await constructs that have not yet landed:

* binding, awaiting the §14 binding/composition split
* requirement and verification, awaiting §20

The examples described below depend on those remaining pieces.

⸻

3. Implementation order

Do not begin by authoring all five examples.

The required order is:

1. close the binding/composition vocabulary ruling;
2. implement §14;
3. implement §20 requirements and verification;
4. make query/evaluation result semantics precise;
5. complete the behavioral substrate needed for LTL;
6. complete quantitative execution semantics;
7. build the conformance corpus;
8. build the five examples in increasing semantic complexity;
9. build the Learn activities from the examples;
10. add example-level and Learn-level semantic coverage gates.

Examples 1–5 should then act as integration tests for steps 1–7.

⸻

4. Phase A: Split bindings from compositions

4.1 Vocabulary ruling

Replace the overloaded semantic use of joins.

Use:

* bindings for correspondence between elements across purposeful models;
* compositions for semantic operations in which reasoning in one domain constrains or participates in reasoning in another.

The distinction is:

Bindings connect denotations. Compositions operate on denotations.

More operationally:

Primitive

An operation wholly inside one semantic domain and not crossing a purposeful-model boundary.

Binding

A declared correspondence between elements represented in different purposeful models. It does not consume one query result to determine another.

Composition

A typed semantic operation in which a result or predicate from one semantic domain participates in evaluating a question in another.

combineWith, if retained, is Learn-page pedagogy/navigation only. It is not a semantic relationship.

4.2 Required bindings

v0.2 needs at least:

appears-in

Establishes that the same engineering entity is represented in multiple purposeful models.

This is identity/correspondence, not a query join.

machine-of-entity

Establishes that a behavioral machine describes a structural entity.

For example:

transaction-lifecycle is the behavioral model of transaction-engine.

The existing CanonMachine.entity mechanism should be used rather than duplicated.

4.3 Required composition

v0.2 initially admits one cross-domain semantic composition:

executions-selected-by-behaviour

A behavioral predicate selects the executions over which a quantitative question is evaluated.

Example:

What is the maximum latency among successful executions?

This must not become a generic pipeline mechanism.

Do not add arbitrary cross-model:

* pipe
* join
* fold
* flatMap
* higher-order composition

merely to make examples convenient.

4.4 Registry work

Update QuerySemantics or the corresponding semantic registry so that bindings and compositions are separately typed and separately totalized.

Every entry must declare:

* source domain
* target domain
* interpretation
* licensing conditions
* result or correspondence type
* semantic basis

The compiler must reject a registered binding or composition without semanticBasis.

4.5 Provenance

The binding mapping should identify its KerML basis and become the fourth presently implementable borrowed-semantic fixture target.

Do not claim that MAGE binding implements all KerML binding semantics.

State exactly which subset is borrowed.

⸻

5. Phase B: Requirements and verification

Implement §20 before the examples depend on requirements.

SysML v2 explicitly distinguishes requirements from verification cases, and its verification-case result vocabulary includes Pass, Fail, Inconclusive, and Error. (⁠OMG)

MAGE should preserve its existing query polarity rather than contorting queries into requirement wording.

5.1 Query

A query asks what the model entails.

Example:

Restricted data reaches an impermitted subscriber.

For a proposition-valued query, the semantic result is fundamentally:

* holds
* refuted

Any inability to evaluate should be represented separately from truth where possible.

5.2 Requirement

A requirement states an obligation.

Example:

Restricted data must not reach an impermitted subscriber.

It references the positive breach query and declares:

satisfied_when: refuted

Do not negate the query internally merely to make the requirement read positively.

5.3 Verification

Verification interprets a query result against a requirement.

At the Workbench level use:

* satisfied
* violated
* inconclusive
* error

Do not call the raw query result satisfied or violated.

Conceptually:

QUERY                         REQUIREMENT
holds/refuted      +         satisfied_when
        \                       /
         \                     /
              VERIFICATION
   satisfied/violated/inconclusive/error

This separation should be visible in the type system.

5.4 unlicensed and exhausted

Review the current result vocabulary while implementing this.

Do not turn unlicensed into a truth value.

It means the purposeful model does not license the question.

Similarly, exhausted should represent an evaluator/resource condition rather than a third logical truth value.

Prefer an internal shape such as:

evaluation:
  status: completed | unlicensed | exhausted | error
  verdict: holds | refuted          # only when completed

rather than allowing all statuses to masquerade as proposition values.

Existing public compatibility can be preserved if necessary, but the semantic distinction must be explicit.

5.5 Provenance

Add the SysML v2 requirement/verification semanticBasis declarations and corresponding fixture obligations.

OMG publishes both normative SysML language documents and normative machine-readable abstract syntax/libraries, including Analysis, Quantities and Units, and Requirement Derivation libraries. Use those as authoritative artifacts rather than restating their definitions from secondary sources. (⁠OMG)

⸻

6. Phase C: Behavioral semantics and LTL

The Transaction Protocol and Autonomous Delivery examples require actual temporal semantics.

6.1 Semantic object

A behavioral model must have an explicit transition-system interpretation.

At minimum define:

* states
* initial state or states
* transitions
* transition labels/events where present
* atomic propositions available to temporal queries

Do not let the visualization define behavior implicitly.

6.2 Reachability

Support existential reachability separately from temporal validity.

Examples:

* Committed is reachable
* Refused is reachable
* Committed is reachable from Valid

These are graph/transition-system questions.

Do not confuse:

There exists an execution eventually reaching P

with:

Every execution eventually reaches P.

6.3 LTL

Support the core:

* not
* and
* or
* implies
* X / next
* F / eventually
* G / always
* U / until

The student-facing form may use readable names, but it must lower to one canonical LTL representation.

Example:

always (
  proposed implies
  eventually (committed or refused)
)

corresponds to:

G(proposed -> F(committed || refused))

The first is UI syntax. The latter identifies the established temporal semantics.

6.4 Atomic propositions

Specify this before implementing examples.

An atomic proposition must have a defined interpretation over behavioral states.

If event occurrence needs to appear in LTL, define how transition events enter the trace alphabet rather than casually treating state labels and transition events as interchangeable.

Keep v0.2 finite-state.

Do not add first-order temporal quantification merely because structural queries support entity variables.

6.5 Terminal behavior

Specify terminal-state treatment.

For v0.2, use stuttering completion: a terminal state repeats indefinitely for purposes of LTL interpretation.

This permits standard infinite-trace LTL while allowing finite workflows to be modeled naturally.

Document this explicitly.

6.6 No implicit fairness

v0.2 makes no fairness assumption.

If the model permits an execution that indefinitely postpones progress, that execution may refute a liveness property.

Do not silently remove such counterexamples because they appear inconvenient.

6.7 Counterexamples

LTL refutation must return a counterexample when the evaluator can produce one.

If model checking uses Büchi-style machinery, preserve the lasso structure:

* finite prefix
* repeating cycle

The UI may simplify presentation, but it must not falsely present an infinite counterexample as an ordinary finite execution.

6.8 Multiple machines

Resolve this before building the Autonomous Delivery example.

Do not implicitly compose independent machines.

Either:

1. v0.2 behavioral models contain one explicit system transition system whose state represents the relevant product state; or
2. v0.2 defines an explicit machine-composition operation, including synchronization/interleaving semantics.

Prefer option 1 for v0.2 unless there is already a compelling implementation reason for general machine composition.

The examples should not smuggle in an undefined asynchronous product.

⸻

7. Phase D: Quantitative semantics

7.1 Quantities

A quantity must have:

* value domain
* unit
* subject/domain being measured
* operation semantics

Required operations:

* value
* sum
* min
* max
* mean
* count

Do not add percentiles unless an example genuinely requires them.

7.2 Units

Units participate in type checking.

Reject meaningless arithmetic rather than treating all scalar values as numbers.

Examples:

* milliseconds + milliseconds: potentially valid
* bytes + bytes: valid
* milliseconds + dollars: invalid
* max(bytes): valid

The SysML v2 Quantities and Units Domain Library is normative machine-readable material and should be the provenance source for the borrowed subset. (⁠OMG)

7.3 Executions

Resolve an important distinction:

LTL is interpreted over infinite traces.

Resource measurements such as latency, memory, energy, and dollars generally concern finite execution observations.

Therefore define a Workbench Execution explicitly as a finite run or run segment with an observation boundary.

For example:

* request completion
* mission completion
* pipeline termination
* operating-mode interval

LTL may interpret a completed execution using stuttering completion.

Quantity measurement applies to the finite observed execution, not to an infinite sum over the stuttering LTL trace.

This distinction must be in the semantic documentation and tests.

7.4 Behavior → Quantity composition

The registered composition should therefore mean approximately:

1. behavior defines or classifies executions;
2. a behavioral predicate selects a subset of finite observed executions;
3. a quantitative measure maps each selected execution to a typed value;
4. an aggregate operates over those values.

Example:

successful =
  { e in Executions | e satisfies success }
max_latency =
  max { latency(e) | e in successful }

This is the semantic foundation needed by Examples 3–5.

⸻

8. Phase E: Build the conformance corpus

Do this before declaring the borrowed semantics complete.

Create:

conformance/
  kerml/
  sysml/
  README.md
  manifest.*

Each fixture must record:

* MAGE construct
* MAGE semanticBasis
* normative standard concept
* normative document/version
* relevant standard section or machine-readable artifact
* smallest standard-side model/example
* corresponding MAGE model
* expected correspondence
* checking method:
    * oracle-executed
    * normative-artifact
    * spec-inspected
* date/version of reference implementation if executed

Do not call spec-inspected fixtures executable conformance.

8.1 Initial fixture targets

At minimum cover the five mappings already declared as owing fixtures:

1. typed element / relationship / feature subset
2. behavioral state / succession subset
3. quantities and units subset
4. binding subset
5. requirement / verification subset

The official KerML release provides normative XMI plus semantic, datatype, and function libraries. (⁠OMG)

The official SysML v2 release similarly provides normative abstract syntax and domain libraries. (⁠OMG)

8.2 CI rule

Once the corpus exists, change the status from:

asserted

to something more precise, such as:

checked by N fixtures: X oracle-executed, Y normative-artifact, Z spec-inspected.

Never collapse those categories.

A future borrowed semantic mapping that declares fixtureRequired: true should fail CI if no fixture manifest entry exists.

That closes the current hole in which provenance is mandatory but evidence is optional.

⸻

9. Example 1: Secure Message Bus

9.1 Educational purpose

First substantial example.

Teach:

* purposeful structural modeling
* entities
* typed relationships
* attributes/features
* direct relation queries
* reachability
* existential quantification
* witnesses
* requirements
* change checking

Later extension:

* structural/behavioral binding
* safety property

9.2 Scenario

A small event-driven system contains:

* External Gateway
* Order Service
* Analytics Service
* Audit Service
* Restricted Processor
* Public Topic
* Restricted Topic

Event types include:

* PublicTelemetry
* OrderEvent
* CustomerRecord

Services have an allowed sensitivity.

Event types have a sensitivity.

Publish/subscribe relationships determine where data may flow.

Keep the model small enough to understand visually without zooming.

9.3 Structural model

Represent:

* services
* topics
* event types where needed
* publishes-to
* subscribes-to
* routes-to or equivalent if semantically justified
* sensitivity attributes

Do not introduce ports merely to resemble SysML.

9.4 Initial student questions

The built-in activity should contain, in order:

Q1: direct relation

Which services subscribe to PublicTopic?

Purpose: simple inspection/navigation.

Q2: reachability

Can an event from ExternalGateway reach AnalyticsService?

Return:

* verdict
* witness path

Q3: security breach

Does restricted data reach any service that is not permitted to process it?

This should be a positive existential breach query.

If holds, return:

* offending event/data classification
* impermitted service
* witness path

Q4: requirement

Is the requirement “Restricted data must not reach an impermitted subscriber” satisfied?

This uses the same breach query with:

satisfied_when: refuted

Q5: change

Ask the student to add:

DebugService subscribes-to RestrictedTopic

with insufficient sensitivity permission.

Pinned requirement must transition:

satisfied -> violated

The UI must identify the changed verdict and witness.

9.5 Behavioral extension

Add a small delivery lifecycle only after the structural questions are understood.

New question:

Can a restricted event be delivered before authorization succeeds?

This demonstrates that structural reachability cannot answer an ordering question.

The Learn activity should explicitly say:

The structural model tells us where data can flow. It does not tell us whether authorization happens before delivery.

Then open/add the behavioral model.

9.6 Student modification tasks

Require:

1. repair the structural breach without deleting the restricted functionality;
2. introduce a debugging subscriber and restore the requirement;
3. alter authorization behavior and inspect which property changes.

9.7 Acceptance criteria

This example must exercise:

* structural primitive
* reachability
* existential query
* witness
* pinned property
* requirement
* verification
* structural/behavior binding

No example-specific evaluator logic.

⸻

10. Example 2: Transaction Protocol

10.1 Educational purpose

Primary behavioral and LTL tutorial.

Teach:

* state
* transition
* initial state
* reachability
* safety
* liveness
* counterexample
* structural/behavioral binding
* distinction between “can happen” and “must eventually happen”

10.2 Scenario

Use the Workbench’s own transaction semantics where practical.

Structural entity:

* Transaction Engine

Behavioral states:

* Draft
* Proposed
* Valid
* Committed
* Refused

Include stale-base validation as a meaningful guard/property.

Do not add complexity merely to mirror all implementation states.

10.3 Questions

Q1

Can Committed be reached?

Existential reachability.

Q2

Can Refused be reached?

Existential reachability.

These establish that both outcomes are admitted.

Q3

Can a stale-base transaction commit?

Safety/breach property.

Expected result should demonstrate whatever the canonical example is designed to teach.

Q4

Once a transaction is refused, can it later commit without being proposed again?

Use an appropriate safety formulation.

Q5

Does every proposed transaction eventually commit or refuse?

Liveness:

G(proposed -> F(committed || refused))

This is the first explicit LTL activity.

Q6

If the property fails, what execution demonstrates the failure?

Show the counterexample, not just refuted.

10.4 Modification

Ask the student to add a transition that permits a transaction to remain indefinitely in a validation/retry state.

Recheck Q5.

The point is that all ordinary destination states may still be reachable while the liveness property becomes false.

This is a particularly important lesson:

Reachability is not liveness.

10.5 Second modification

Add:

Refused -> Proposed

as an explicit retry.

Ask:

Which existing property now needs to be reconsidered?

Do not tell the student automatically that every red property is a bug. Some model changes legitimately change the intended requirement.

10.6 Binding

Bind the behavioral machine to the structural TransactionEngine.

The Learn text should explain:

This machine describes the behavior of that structural entity.

Nothing stronger.

10.7 Acceptance criteria

Exercise:

* machine-of-entity binding
* existential reachability
* safety LTL
* liveness LTL
* terminal-state semantics
* counterexample
* pinned temporal property
* property change after mutation

⸻

11. Example 3: Embedded Sensor Node

11.1 Educational purpose

Primary resource-budget example.

Teach:

* quantities
* units
* aggregation
* resource budget
* margin
* purposeful omission
* behavior-informed resource analysis

This should be the example that makes Quantity feel like engineering rather than arithmetic.

11.2 Scenario

A battery-powered embedded sensor node has:

* MCU
* sensor driver
* radio stack
* telemetry queue
* inference engine
* model weights
* inference workspace
* packet buffer
* logging buffer

Physical SRAM budget:

256 KiB

Flash may also be represented, but SRAM is the primary activity.

Do not overload the first view with CPU, energy, flash, and timing simultaneously.

11.3 Quantitative model

Represent memory quantities in bytes/KiB.

Use plausible fixed values chosen to produce an instructive near-budget configuration.

For example, choose values so:

* normal sensing is comfortably below 256 KiB;
* inference is near the limit;
* inference + maximum transmit buffering exceeds it unless lifetimes are considered;
* doubling one queue causes a pinned requirement to fail.

The exact numbers should be deterministic fixtures, not randomly generated.

11.4 Questions

Q1

Which component or allocation consumes the most SRAM?

Q2

What is total modeled SRAM if all allocations are assumed simultaneously live?

Q3

How much margin remains below 256 KiB?

Q4

Does the modeled configuration satisfy the 256 KiB SRAM requirement?

Q5

What happens if telemetry queue depth doubles?

Modify the model and recheck.

Q6

Which change restores at least 20% SRAM margin?

This is a design activity. Permit several valid solutions.

11.5 Purposeful-reduction moment

Now ask:

Are all these buffers actually live at the same time?

The quantitative model alone cannot answer this if lifetime depends on operating behavior.

This is the earned transition to Behavior.

Add operating states such as:

* Sleeping
* Sampling
* Inferring
* Transmitting

Associate resource lifetimes with relevant execution states/segments.

Then ask:

Q7

What is peak SRAM over modeled operating behavior?

This answer should differ from naïvely summing every allocation.

Q8

Does every modeled operating mode fit in SRAM?

Q9

What execution or mode produces peak memory consumption?

Return the responsible execution/mode as evidence.

11.6 Important semantic constraint

Do not implement “peak memory” as an unexplained example-specific function.

It must be expressible using the quantitative semantics and, where needed, the registered Behavior → Quantity composition.

If resource lifetime requires a new general semantic operation, design and register that operation explicitly before landing the example.

11.7 Acceptance criteria

Exercise:

* quantity
* units
* sum
* max
* requirement
* margin
* Behavior → Quantity composition
* purposeful omission
* model expansion motivated by an unanswerable question

⸻

12. Example 4: Processing Pipeline

12.1 Educational purpose

Primary execution-cost and cross-domain composition example.

Teach:

* finite executions
* behavioral selection
* latency/cost measures
* aggregation
* performance requirements
* difference between all executions and successful executions

12.2 Scenario

Document-processing pipeline:

Upload
  ->
Parse
  ->
Analyze
  ->
Remediate
  ->
Validate
  ->
Complete

Include at least:

* one failure path
* one retry path
* successful completion

Quantities:

* stage latency
* model/API cost where useful

Latency is primary. Cost can be secondary.

12.3 Questions

Q1

What is the latency of the nominal successful execution?

Q2

What is the cheapest successful execution?

Q3

What is the maximum latency of any completed execution?

Q4

What is the maximum latency among successful executions?

This is the canonical cross-domain composition question.

Behavior supplies the selection predicate.

Quantity supplies the measurement and max.

Q5

Do all successful executions complete within 2 seconds?

Pinned performance requirement.

Q6

Which execution violates the latency requirement?

Return execution evidence.

12.4 Modification

Add a validation retry.

Ask students to predict before querying:

Will the 2-second property still hold?

Then evaluate.

12.5 Design task

Restore the latency requirement without removing validation.

Several solutions may be possible:

* reduce stage latency
* alter retry behavior
* change pipeline structure if licensed

The goal is to use the model as an engineering decision instrument.

12.6 Acceptance criteria

Exercise:

* finite execution semantics
* Behavior → Quantity composition
* behavioral predicate selection
* max/min/sum
* units
* requirement
* evidence for worst-case execution
* property rechecking

⸻

13. Example 5: Autonomous Delivery System

13.1 Educational purpose

Capstone example.

Use all three model forms without becoming a toy autonomous-driving simulator.

Teach:

* purposeful views of one system
* multiple bindings
* structural safety
* temporal behavior
* quantitative constraints
* integrated design tradeoff
* agent-assisted model modification

13.2 Scenario

Small autonomous delivery rover.

Structural entities:

* Mission Planner
* Motion Controller
* Safety Monitor
* Drive System
* Localization
* Battery

Behavioral lifecycle:

* Idle
* Planning
* Driving
* Delivered
* Aborted
* Fault

Quantities:

* mission energy
* perhaps latency for safety response

Keep one primary quantitative concern: energy.

13.3 Structural questions

Q1

Which components can ultimately influence the Drive System?

Return paths.

Q2

Can Mission Planner bypass the Safety Monitor and directly command Drive?

Use a positive breach query.

Requirement:

Drive commands must pass through the permitted control path.

Do not pretend this is full information-flow analysis. State the exact graph property being checked.

13.4 Behavioral questions

Q3

Can the system enter Driving?

Q4

Can it reach Delivered?

Q5

Can motion remain enabled while the system is in Fault?

Safety property.

Q6

Does every accepted mission eventually reach Delivered or Aborted?

Liveness property.

13.5 Quantitative questions

Q7

What is the maximum energy consumption of a completed mission?

Q8

Do all successful missions fit within the mission energy budget?

13.6 Cross-model question

Q9

Among executions satisfying the mission-completion behavior, what is the maximum energy consumption?

Use the registered Behavior → Quantity composition.

Do not invent a Structure × Behavior × Quantity mega-query merely for the capstone.

13.7 Design modification

Ask:

Add a recovery behavior after localization failure.

Then require the student to recheck:

* fault safety
* mission termination
* energy budget

The likely result should demonstrate a real tradeoff: the recovery behavior improves mission completion but consumes additional energy.

Do not force exactly one correct redesign.

13.8 Agent activity

This example should contain the clearest agent exercise.

Prompt the agent through the same semantic facade available to the human:

Propose a recovery behavior that preserves the safety property and keeps successful missions within the energy budget.

The agent may:

1. inspect the relevant models;
2. issue registered queries;
3. propose a model change;
4. cause pinned properties to be reevaluated;
5. inspect witnesses/counterexamples;
6. revise.

Do not provide the agent with a hidden richer representation.

The pedagogical point is:

Human and agent work over the same semantic model and the same engineering checks.

13.9 Acceptance criteria

Exercise:

* all three model forms
* bindings
* LTL
* quantity
* requirements
* verification
* witnesses/counterexamples
* composition
* agent semantic facade
* pinned-property change checking

⸻

14. Common activity structure

Every example card/workspace should use the same learning loop:

Predict

Ask the student what they think the answer will be.

Query

Run the semantic query.

Inspect evidence

Show:

* value
* witness
* counterexample
* responsible execution

as appropriate.

Modify

Change the model.

Recheck

Automatically rerun pinned properties.

Explain

Ask why the result changed.

Extend

Pose a question the current purposeful model cannot answer.

Add a model

Introduce another model form only when the new engineering question earns it.

This sequence is more important than having a large number of examples.

⸻

15. Built-in example metadata

Examples should not be five ad hoc folders.

Give them a typed manifest.

Conceptually:

id
title
engineeringContext
learningObjectives[]
initialModels[]
activities[]
pinnedProperties[]
requirements[]
semanticCoverage[]
expectedResults[]
mutations[]
extensions[]
agentActivities[]
standardsGrounding[]

Each activity should identify:

* question shown to student
* model(s) required
* query ID
* expected result
* evidence type
* concepts exercised
* whether it is prediction/query/modification/design
* prerequisite activities

This allows Learn to be generated from authoritative example metadata rather than duplicating prose and semantics.

⸻

16. Semantic coverage gate for examples

Add a test analogous in spirit to model coverage.

For every built-in example:

* every student-visible executable question maps to a registered query;
* every claimed expected result is test-pinned;
* every pinned property is evaluated in CI;
* every requirement references an actual query and valid satisfied_when;
* every binding references valid elements;
* every composition is registered;
* every unit is recognized;
* every LTL formula parses and type-checks;
* every promised witness/counterexample is actually obtainable;
* every prescribed mutation produces its documented verdict transition.

No prose-only “question” may imply capability the kernel cannot perform.

⸻

17. Learn page integration

The upper Learn page teaches:

1. Models answer questions
2. Structure
3. Behavior
4. Quantity
5. Witnesses and counterexamples
6. One system, several purposeful models
7. Bindings and composition
8. Queries to properties
9. Requirements and verification
10. Humans and agents use the same models
11. Standards foundations
12. What Workbench deliberately leaves out

The lower Learn page is driven by the five example manifests.

Each example card shows:

System

A compact visual.

You can answer now

Questions licensed by the initially loaded model.

Try changing

A mutation that should alter an answer/property.

You cannot answer yet

A deliberately unlicensed engineering question.

Add

The additional purposeful model that licenses the new question.

Open workspace

Launch the exact built-in state.

This structure should make purposeful reduction concrete rather than merely define it.

⸻

18. Standards presentation on Learn

Do not teach SysML syntax.

Do not claim that MAGE is a SysML implementation.

Use restrained language:

Workbench uses a small educational vocabulary whose modeling semantics are grounded where appropriate in SysML v2 and KerML. Structural queries, LTL properties, quantitative analysis, and Workbench change checking also use explicitly identified semantic extensions.

The implementation already derives Learn’s standards claims from semanticBasis. Preserve that architecture.

Once conformance fixtures exist, Learn may state the actual evidence level if useful.

For example:

This subset is mapped to the corresponding SysML/KerML concepts and checked by the Workbench conformance corpus.

Do not say that until the corpus exists.

⸻

19. Recommended implementation waves

Wave 1: Semantic closure

Land:

* joins split into bindings/compositions
* binding types
* Behavior → Quantity composition type
* requirement
* satisfied_when
* verification result vocabulary
* query-result/evaluation-status cleanup

Exit criterion:

The registry can represent every semantic relationship required by the five examples without example-specific mechanisms.

Wave 2: Temporal kernel

Land:

* explicit transition-system interpretation
* atomic propositions
* LTL AST/parser
* evaluator/model checker
* stuttering terminal semantics
* no-fairness rule
* counterexample representation
* UI rendering of traces/lassos

Exit criterion:

Transaction Protocol Q1–Q6 are executable and test-pinned.

Wave 3: Quantitative kernel

Land:

* quantity/unit typing
* aggregation
* finite execution definition
* execution measurement
* Behavior → Quantity selection
* evidence for extrema

Exit criterion:

Embedded Sensor Node and Processing Pipeline core questions are executable.

Wave 4: Conformance corpus

Land all five initially owed fixture families.

Add CI completeness check.

Update registry status language from asserted-only to exact checked counts.

Exit criterion:

Every borrowed mapping in v0.2 that requires a fixture has one, classified by evidence method.

Wave 5: Examples 1–2

Build Secure Message Bus and Transaction Protocol.

Use them to harden:

* witnesses
* requirements
* LTL
* property-change UI

Do not proceed until all student-visible questions are test-pinned.

Wave 6: Examples 3–4

Build Embedded Sensor Node and Processing Pipeline.

Use them to harden:

* units
* finite executions
* quantitative evidence
* Behavior → Quantity composition

Wave 7: Example 5

Build Autonomous Delivery System only after the first four expose any weaknesses in the semantic surface.

Do not add new generic semantics merely to make the capstone impressive.

Wave 8: Learn

Generate or strongly derive the activity cards from example metadata.

Add the progression:

Predict
  ->
Query
  ->
Evidence
  ->
Modify
  ->
Recheck
  ->
Extend

Wave 9: Agent facade

Ensure every operation needed by the five examples is available through the agent-facing facade and derives from the same registered semantics.

Add tests that equivalent human/UI and agent/facade queries lower to the same canonical query representation.

⸻

20. v0.2 release gate

Do not call this semantic regime complete until all of the following are true:

1. No semantic use of overloaded join remains.
2. Bindings and compositions are distinct registry concepts.
3. Requirements and verification are implemented.
4. violated exists only at the verification/property interpretation layer, not as a raw query truth value.
5. LTL has defined trace semantics.
6. Terminal behavior is specified.
7. Fairness policy is specified.
8. Counterexamples are first-class.
9. Quantities have unit checking.
10. Finite measured executions are distinguished from infinite LTL traces.
11. Behavior → Quantity composition is typed and registered.
12. All five owed SysML/KerML conformance fixture families exist.
13. Each conformance fixture's evidence method is recorded honestly, and the grade is DERIVED from the fixture's own `evidence[]` rather than compared against a second copy of itself. A fixture's `method` is the weakest rung among its DECISIVE evidence; evidence marked corroborating does not set the grade.
14. Every one of §21's five flagships ships as a built-in example, each mapped to exactly one example id; any additional built-in is declared a non-flagship with its membership question recorded.
15. Every executable student question is backed by a registered query.
16. Every expected answer is test-pinned.
17. Every promised mutation is tested.
18. Every pinned property is automatically rechecked.
19. Learn’s standards claims derive from registry provenance.
20. The agent facade exposes the same semantic operations as the human interface.
21. No built-in example relies on hidden example-specific semantics.

⸻

21. The intended educational progression

The five examples should collectively tell one story.

**Two notes a reader of this section needs, recorded here because both were discovered by reading
code rather than by reading §20 (release-gate audit, 2026-10-05).**

**The five flagships map onto six shipped built-ins.** `Secure Message Bus` → `message-bus`,
`Transaction Protocol` → `transaction-workspace`, `Embedded Sensor Node` → `embedded-sensor-node`,
`Processing Pipeline` → `document-processing`, `Autonomous Delivery System` → `autonomous-delivery`.
A sixth built-in, `worker-queue`, ships as a **non-flagship**: §31 drops Worker Queue from its three
while §18 keeps it, and nothing has adjudicated that — the open membership question is declared
beside the shipped-id list in the application's example registry. **Nothing in code names which five
are flagships**, so the mapping above lives only in prose and a seventh built-in would be
indistinguishable from a sixth flagship. Criterion 14 is checkable in neither direction until the
registry declares the subset.

**This progression order is NOT the order a student sees.** The shipped menu runs Message Bus →
Transaction Workspace → Document Processing → Worker Queue → Embedded Sensor Node → Autonomous
Delivery, swapping the Processing Pipeline and Embedded Sensor Node slots. The inversion is
deliberate and reasoned in the example registry: the Learn cards take the FIRST shipped example
instantiating a model type, so menu position decides which example every card points at. The
pedagogical sequence below and the menu are two different orders, for a stated cause.

Secure Message Bus

A model can answer a precise structural question and explain its answer with a witness.

Transaction Protocol

Behavior adds questions about time. Reachability is not enough; temporal properties can be checked and refuted with counterexamples.

Embedded Sensor Node

Engineering also requires quantitative judgment. A resource model can answer budget questions, but behavior may be needed to determine what is simultaneously possible.

Processing Pipeline

Different purposeful models can participate in one engineering question through an explicitly defined semantic composition.

Autonomous Delivery System

Structure, behavior, and quantity provide different reductions of one system. Engineers and agents can use those models together to make and check design changes.

The student should finish the sequence understanding not “MAGE has three model types,” but:

Different engineering questions require different purposeful models. Because those models have defined semantics, humans and agents can query them, preserve important answers as properties, and detect when a design change invalidates an engineering claim.

One implementation point I would emphasize even more strongly than in our earlier discussion: the Embedded Sensor Node is probably the best test of whether the new regime is actually working. If we can cleanly move the student from “sum all these memory allocations” to “that is too conservative because these lifetimes are behavior-dependent” to “now the behavioral model licenses a better peak-memory answer,” then the distinction among purposeful models, semantics, and composition has become concrete rather than philosophical.

Also, the conformance work is now nicely bounded. OMG provides normative machine-readable KerML abstract syntax and semantic/data/function libraries, while SysML v2 provides normative abstract syntax plus Systems, Analysis, Quantities and Units, and Requirement Derivation libraries.   So I would make Wave 4 a real implementation wave, not documentation cleanup: five tiny fixtures, explicit evidence classifications, and a CI gate preventing a sixth borrowed construct from arriving with only an assertion.

===

One other note: Render via Mermaid with rendering on a per-type basis and with a clear definition of join?

===

Yes. I would make that an explicit architectural rule, because otherwise “Mermaid” risks becoming either the semantics or one generic graph renderer.

Add this to the spec:

Rendering and Cross-Model Presentation

22. Rendering is derived and model-type-specific

Workbench renders models through Mermaid, but Mermaid is a projection of the canonical model, never an authoritative representation.

The direction is:

Canonical model
      |
      +--> semantic interpretation --> queries / properties
      |
      +--> renderer for model type --> Mermaid --> visual

Never:

Mermaid --> meaning

A model remains valid and queryable without rendering.

Each model type owns its own renderer because each model type has different visual semantics.

22.1 Structural renderer

Structural models render as graph/flowchart-style Mermaid.

The renderer should visually distinguish where useful:

* entities
* entity types
* typed relationships
* direction
* selected/witness paths
* elements participating in violations

A structural witness should be renderable as a highlighted path over the same diagram.

The structural renderer must not introduce semantic nodes merely to obtain a convenient layout.

22.2 Behavioral renderer

Behavioral models render using Mermaid state-diagram facilities where these faithfully represent the Workbench model.

Show:

* initial state
* states
* transitions
* transition labels/events
* terminal states where applicable

For query evidence, support overlays for:

* reachable state
* witness execution
* counterexample trace
* repeating portion of an LTL counterexample

If Mermaid cannot adequately represent a lasso counterexample directly, the Workbench may augment the diagram with its own overlay/annotation. Do not distort the semantic object to fit Mermaid.

22.3 Quantitative renderer

Quantitative models must have their own rendering policy.

Do not force quantities into the structural renderer simply because Mermaid can draw boxes and arrows.

For a pipeline or execution-cost model, a Mermaid flowchart may be appropriate:

Parse
120 ms
  |
  v
Analyze
430 ms

For a resource-budget model, the useful view may instead annotate structural elements with quantities or present a resource-oriented projection.

The renderer is chosen by the quantitative model’s semantics and engineering question.

In particular, the Embedded Sensor Node should make memory allocation and budget visually legible rather than merely drawing a generic dependency graph.

22.4 Renderer registry

Each model type should register something equivalent to:

modelType
  semanticDomain
  renderer
  renderProjection
  evidenceProjection

There should be no generic renderAnythingAsGraph() fallback for a registered model type.

A new model type cannot ship without declaring its rendering strategy or explicitly declaring itself nonvisual.

22.5 Rendering tests

For each built-in example:

* canonical model validates independently of rendering;
* rendering is deterministic;
* all semantically relevant rendered elements map back to canonical IDs;
* witness/counterexample highlighting uses canonical IDs;
* no renderer creates authoritative semantic facts;
* changing layout does not change query results.

⸻

23. Cross-model views and the meaning of “join”

Use the word join carefully.

At the semantic level, v0.2 should not expose join as one operation covering several unrelated concepts.

There are two semantic relationships:

Binding

A binding establishes correspondence between model elements.

Example:

STRUCTURE                         BEHAVIOR
+-----------------+              Proposed
| Transaction     |                 |
| Engine          |                 v
+-----------------+               Valid
        ^                          /   \
        |                         /     \
        +---- machine-of --------+       ...
             transaction-lifecycle

The line between the two views represents a binding.

It means:

This behavioral model describes this structural entity.

It does not merge the models.

It does not imply equality between arbitrary objects.

It does not consume the result of a behavioral query.

Composition

A composition occurs when reasoning in one semantic domain participates in evaluating a question in another.

Example:

BEHAVIOR
executions satisfying success
          |
          | selects
          v
   finite executions
          |
          | latency(e)
          v
      QUANTITY
          |
          | max
          v
       1.82 s

This is the registered:

executions-selected-by-behaviour

composition.

The behavioral result constrains the domain of the quantitative operation.

23.1 Definition

Use this definition throughout the implementation documentation:

Binding connects denotations. Composition operates on denotations.

And for student-facing material:

A binding says which things correspond. A composition lets one model participate in answering a question over another.

23.2 “Join” in the UI

Avoid presenting a generic Join command to students.

If the interaction needs a general affordance for putting two purposeful models together visually, call it something non-semantic such as:

* Add related model
* Show together
* Compare views

Once the relationship is established, display its actual semantic kind:

bound by: machine-of-entity

or:

composed by: executions-selected-by-behaviour

Do not teach students that every line between two models is a join.

23.3 Cross-model rendering

When multiple purposeful models are shown together, retain their visual boundaries.

For example:

+-------- STRUCTURE --------+       +-------- BEHAVIOR --------+
|                          |       |                          |
|   TransactionEngine      |<------| transaction-lifecycle    |
|                          |       |                          |
+--------------------------+       +--------------------------+
                   machine-of-entity

Do not flatten both models into one Mermaid graph.

Each side is rendered by its own model-type renderer. The Workbench composes the rendered views and draws the binding between their canonical elements.

This preserves the important fact that they are different purposeful reductions.

For Behavior → Quantity composition:

+--------- BEHAVIOR --------+
|                           |
| successful executions     |
|                           |
+---------------------------+
             |
             | executions-selected-by-behaviour
             v
+--------- QUANTITY --------+
|                           |
| max latency = 1.82 s      |
|                           |
+---------------------------+

Again, the connecting edge is not a generic graph edge. It represents a registered semantic composition.

23.4 Mermaid boundary

Prefer Mermaid for the contents of each model view.

Do not require Mermaid to own the entire multi-model canvas.

A practical architecture is:

Workbench canvas
   |
   +-- Model panel A
   |      `-- Mermaid rendering from renderer A
   |
   +-- Model panel B
   |      `-- Mermaid rendering from renderer B
   |
   `-- Workbench overlay
          bindings
          compositions
          selections
          query evidence

This gives the Workbench control over cross-model semantics while retaining Mermaid as the inexpensive per-type renderer.

⸻

24. Rendering requirements for the five built-in examples

Secure Message Bus: structural Mermaid view; witness paths highlighted. Behavioral extension uses a separate state view. machine-of-entity binding shown between views.

Transaction Protocol: state-diagram Mermaid is primary. Counterexample traces highlight transitions in sequence; an LTL lasso must identify its repeating portion.

Embedded Sensor Node: resource-oriented quantitative rendering. Components/allocations show KiB values and the 256 KiB budget. When behavior is added, show the operating-state model separately and explicitly show the Behavior → Quantity composition used to compute peak SRAM.

Processing Pipeline: behavioral pipeline and quantitative annotations may visually align, but remain semantically distinct. The UI should make it obvious that “successful executions” comes from Behavior while “maximum latency” comes from Quantity.

Autonomous Delivery System: deliberately show multiple purposeful views rather than producing one enormous system diagram. This example should be the clearest demonstration that one engineering system can have several simultaneously useful reductions.

⸻

25. Rendering acceptance rule

Add a V-rule:

V-RENDER: Every rendered view is a typed projection of an authoritative model. Model types own their render projections; a type declares a projection or declares itself nonvisual, and there is no generic fallback. Rendering may not alter semantic facts — the IR is immutable and the renderer holds no mutation authority. Rendering may not create them: every rendered element resolves to a canonical element or to a declared synthesis class, and the residue — that a view's prose asserts no more than its fields support — is `asserted`.

V-RENDER-X: Cross-model visual connections are *derived from* registered bindings and compositions, not merely consistent with them.

> **Edited 261005 by the wave that implemented §22's registry — flagged for the author's review.**
> Three changes, each because the rule as drafted claimed enforcement the code did not have, or
> claimed less than it has. Full argument in `DESIGN-render-rules-261004.md` §C and §H.
>
> 1. **"Neither create nor alter" is split.** The verb pair fused a type-system guarantee to a
>    reviewer's judgment. *Alter* is the best-held clause in the rule — every declared member of
>    `src/ir/types.ts` is `readonly`, with `ReadonlyMap` collections, re-derived by `npm run check`
>    on every run. *Create* is the hard half and stays `asserted` at the residue: "semantic fact"
>    names no type, so it decomposes into claims that have a subject (every element resolves to a
>    canonical id or to a declared synthesis class, held by `test/render-no-invention.test.ts`) plus
>    one that does not (the twin's prose asserting no more than its fields support).
> 2. **"Model types own their render projections" gains the clause that makes it checkable.** A
>    required `renderStrategy` field on `ModelType`, with a `nonvisual` arm, is what the compiler can
>    hold; "no generic fallback" then becomes a type error rather than a style note.
> 3. **The cross-model clause moves out into V-RENDER-X.** §H proposed marking it *"a commitment,
>    not a constraint"* because no multi-model canvas existed. **That caveat is deliberately NOT
>    carried, and the reason is §J:** the canvas landed in `src/app/cross-model.ts` between §H's
>    drafting and this edit, it landed as *derived from* rather than *checked against*, and
>    `test/cross-model.test.ts` holds it. So the clause is a live constraint and marking it a
>    commitment would now understate it — the opposite error, and the same class.

And add a corresponding rule for terminology:

V-CROSSMODEL: Cross-model correspondence is represented as a binding; cross-model evaluation is represented as a composition. “Join” is not an authoritative semantic category.

These should be compiler/test-enforceable where possible rather than style-guide prose alone.

One nuance: I would not define “join” more clearly and keep it. I think we’ve now discovered that join was hiding two different things. The clean definition is that there isn’t a generic semantic join. There are bindings and compositions, and a multi-model visualization can show either.

The per-type renderer rule is also important for the examples. It means the embedded-memory example doesn’t have to pretend that a state machine, a memory budget, and a component graph are all fundamentally the same kind of boxes-and-arrows object. The per-type renderer sits underneath each appropriate visual projection.

> **Edited 261005: "Mermaid" → "the per-type renderer", flagged for the author's review.** The rule
> survives the substitution intact; the dependency it names was declined on the record. `PLAN.md`
> rules that dagre was chosen over Mermaid/PlantUML, ELK.js and Graphviz-WASM because the renderer
> must be synchronous and DOM-free, and Mermaid is absent from the dependency set — the workbench
> took Mermaid's layout engine (dagre) and declined its renderer. Leaving the name in sends every
> future reader of this section looking for a library that was rejected by ruling. §22.1, §22.2,
> §22.3 and §23.4 carry the same framing and are NOT edited here; that is a prose sweep this wave's
> scope did not include (`DESIGN-render-rules-261004.md` §G recommends it, with Mermaid named once
> in a note as considered and declined).
