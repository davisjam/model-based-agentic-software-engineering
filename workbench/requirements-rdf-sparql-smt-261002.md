Yes. And first, Turtle is simply a human-readable serialization syntax for RDF. It is the syntax I was using in examples such as :remediation :mayInvoke :gateway . Students do not need it. Given our direction, I would not make Turtle part of the MAGE authoring experience. YAML is better for the typed UML-ish surface model; RDF is the normalized semantic IR underneath; SPARQL is the standard query language exposed to agents and optionally to advanced users.

Below is the spec I would hand the implementation agent. It incorporates most of the agent’s seven questions directly into the architecture. I agree with nearly all of its recommendations, with two refinements: path aggregation should not be baked into the general RDF/SPARQL layer, and once SMT exists we should use it rather than deliberately maintaining a weaker interval-analysis semantics.

MAGE Model Workbench v0.1

Semantic, query, analysis, agent, and browser architecture

1. Purpose

MAGE is a lightweight, browser-native modeling workbench for answering consequential engineering questions about software systems.

Its purpose is not to specify software completely. Models preserve enough information to make selected engineering questions inexpensive to answer. Implementation detail that does not matter to those questions should remain in the implementation, where coding agents can inspect and manipulate it directly.

The core loop is:

engineering question
        ↓
purposeful model
        ↓
query
        ↓
answer + evidence
        ↓
implementation decision

The design should therefore optimize for:

* small purposeful models;
* explicit entities, relations, states, properties and quantities;
* composition across models through shared identity;
* standard query syntax;
* deterministic answers with evidence;
* easy construction and revision by coding agents;
* visible, accessible interaction by humans;
* refusal when the model does not preserve enough information.

MAGE is explicitly not a UML implementation, general-purpose formal specification language, OCL implementation, Semantic Web reasoner, programming language, or replacement for source code.

⸻

2. Representational layers

MAGE should have four deliberately distinct representations.

.mage.yaml
friendly typed authoring format
        ↓
Typed MAGE IR
application semantics
        ↓
RDF Dataset
canonical relational semantic projection
        ↓
SPARQL / analysis lowering
        ↓
SMT when symbolic reasoning is required

These layers should not be conflated.

2.1 MAGE YAML

.mage.yaml is the portable, editable, agent-friendly authoring and interchange format.

Students normally do not write it manually. Coding agents can.

It should use typed constructs appropriate to the supported model families rather than asking agents to emit RDF directly.

For example:

mage: 1
system:
  id: docable
  name: DocAble
entities:
  remediation:
    type: service
    label: Remediation Service
  gateway:
    type: service
    label: Model Gateway
models:
  service-flow:
    type: structural
    question: Which services may invoke which others?
    relations:
      - id: remediation-gateway
        type: may-invoke
        from: remediation
        to: gateway
  document-lifecycle:
    type: state-machine
    entity: document
    states:
      - waiting
      - processing
      - reviewed
      - published
      - failed
    initial: waiting
    variables:
      retry_count:
        type: integer
        range: [0, 3]
        initial: 0
    transitions:
      - from: waiting
        to: processing
      - from: processing
        to: failed
      - from: failed
        to: waiting
        guard: retry_count < 3
        effects:
          retry_count: retry_count + 1

This is intentionally more structured than RDF. It lets us validate what constitutes a state machine, transition, bounded state variable, etc.

⸻

3. Typed MAGE IR

The YAML parser SHALL normalize input into a typed in-memory MAGE IR.

This IR is the application-level semantic representation. It should contain concepts such as:

System
Entity
Model
StructuralModel
StateMachine
State
Transition
Relation
Property
Quantity
Parameter
Requirement
Query
Hypothesis
Provenance

The renderer, validator, transaction engine and SMT compiler may operate on this typed representation.

The typed IR prevents RDF from becoming the place where we reinvent object structures through piles of triples.

For example, a Transition is an actual TypeScript discriminated-union member, not merely “some RDF resource with several predicates.”

⸻

4. RDF semantic IR

Every valid typed MAGE model SHALL have a deterministic projection into an RDF Dataset.

RDF is the canonical relational representation of the semantic facts represented by the model.

This is the key role of RDF.

A MAGE relation:

- id: remediation-gateway
  type: may-invoke
  from: remediation
  to: gateway

projects conceptually to:

remediation → mayInvoke → gateway

A state transition:

from: processing
to: reviewed

may produce facts corresponding to:

transition17 rdf:type Transition
transition17 from processing
transition17 to reviewed
processing canTransitionTo reviewed

The first representation preserves transition identity. The latter may be a derived relation useful for graph queries.

4.1 Named graphs

Each purposeful model SHALL project to an RDF named graph.

Conceptually:

GRAPH service-flow {
    remediation mayInvoke gateway
}
GRAPH deployment {
    remediation deployedOn workerPool
}
GRAPH data-policy {
    gateway accepts Public
}
GRAPH performance {
    gateway latencyMs 250
}

Shared entity identity allows information from different purposeful reductions to join.

This directly implements the modeling principle:

Different questions require different reductions. Shared identity allows those reductions to compose.

4.2 RDF is not OWL

MAGE SHALL NOT implicitly acquire RDFS/OWL inference semantics.

RDF supplies:

* stable identity;
* typed resources;
* typed relations;
* properties;
* named graphs;
* a standard query substrate.

MAGE defines the semantics of its own vocabulary.

No general ontology reasoning is required.

⸻

5. Supported model vocabulary

v0.1 should support a deliberately small UML-ish vocabulary.

Structural

Support:

* entities/components/services/artifacts;
* typed relations;
* containment;
* interfaces/ports only if a concrete question requires them;
* deployment/location;
* dependency/invocation/data-flow style relations;
* cardinality only where useful.

These cover useful subsets of UML class, component, package, deployment, object and composite-structure models without claiming UML compliance.

Behavioral

Support finite state machines:

* states;
* initial state;
* transitions;
* guards;
* effects;
* finite variables;
* optional synchronization.

All mutable state MUST have a finite domain in v0.1.

Default semantics:

* one instance per machine;
* nondeterminism permitted;
* enabled transitions represent alternatives;
* multiple machines use interleaved execution;
* synchronization is explicit and opt-in.

Multiplicity and complicated participant binding should be deferred.

Quantitative

Quantities annotate existing semantic objects:

* entity;
* relation;
* state;
* transition;
* parameter;
* perhaps model as a whole.

Core dimensions should initially include:

* duration;
* memory/bytes;
* monetary cost;
* ratio/probability;
* dimensionless count.

Quantitative modeling is deliberately modest. We need enough to ask useful engineering questions, not a simulation language.

⸻

6. Quantities are not state

The implementation agent is correct on this point.

Quantitative annotations SHALL NOT enter the behavioral state vector merely because their values are real-valued.

A behavioral configuration contains only control state and declared mutable variables:

Configuration =
    machine states
    + finite mutable variables

Quantities are annotations evaluated over configurations, transitions, paths or model structure.

Thus:

latency: 5 ms
hit_rate: 0.80
memory: 128 MB

does not make the reachable configuration space infinite.

This is a hard semantic boundary.

⸻

7. Units and dimensions

Quantities SHALL be dimensionally typed.

For example:

dimensions:
  duration:
    base: ms
    units:
      ms: 1
      s: 1000
  memory:
    base: MB
    units:
      KB: 0.0009765625
      MB: 1
      GB: 1024
  ratio:
    base: "1"
    range: [0, 1]
  cost:
    base: usd

Literals SHALL normalize to the base unit during model normalization.

Operations across incompatible dimensions SHALL fail validation.

Thus:

250 ms + 2 s       valid
128 MB + 1 GB      valid
250 ms + 128 MB    invalid

Do not silently coerce dimensions.

⸻

8. Quantitative scope

The implementation agent identified an important distinction that should become explicit:

Memory is principally a property over configurations. Latency and cost are principally properties over executions.

This gives us cleaner semantics than an arbitrary list of aggregation operators.

For a configuration c, peak modeled live memory can be defined approximately as:

retained memory of active states/entities in c
+
temporary memory associated with the active operation

Then:

peak_memory =
    max over reachable configurations c
        memory(c)

Latency instead normally concerns a trace:

latency(trace) =
    sum transition/entity/relation latency
    according to the declared accounting model

This distinction should be visible in the IR.

⸻

9. Addressing quantitative annotations

The agent is correct that this must be unified.

Every annotation SHALL target a stable semantic ID.

For example:

quantities:
  parse-latency:
    target: transition:parse
    dimension: duration
    value: 20 ms
  gateway-latency:
    target: relation:remediation-gateway
    dimension: duration
    range: [100 ms, 500 ms]
  cache-memory:
    target: entity:cache
    dimension: memory
    value: 128 MB

All references SHALL be resolved during validation.

A quantity whose target does not exist is an error.

No dangling annotations.

⸻

10. Model metrics

The implementation agent’s reserved namespace recommendation is good.

Facts computed from the model rather than asserted about the modeled system SHALL be explicit:

metrics.state_count
metrics.transition_count
metrics.entity_count
metrics.relation_count

They must never appear as ambient magic identifiers.

This permits expressions such as:

value:
  expression: metrics.state_count * 2 ms

while making clear that state_count describes the model, not the software system.

⸻

11. SPARQL is the standard query language

MAGE SHALL support a useful subset of SPARQL 1.1 as its standard relational query language.

The workbench should not invent a competing graph-query DSL.

Agents should be told:

The semantic model is exposed as an RDF Dataset. Query represented model facts using supported SPARQL 1.1.

Students normally need not write SPARQL.

An agent can translate:

Can Remediation reach Model Gateway?

into:

ASK {
  mage:remediation mage:mayInvoke+ mage:modelGateway .
}

Or:

Which reachable services accept only public data?

into:

SELECT ?service
WHERE {
  mage:remediation mage:mayInvoke+ ?service .
  ?service mage:accepts mage:Public .
}

11.1 Initial supported SPARQL subset

At minimum:

* SELECT;
* ASK;
* basic graph patterns;
* named graphs;
* FILTER;
* equality/comparison;
* property paths;
* OPTIONAL where useful;
* aggregates such as COUNT, MIN, MAX, SUM;
* GROUP BY;
* ORDER BY;
* LIMIT.

Do not invent SPARQL extensions in v0.1.

Every accepted query should remain valid SPARQL.

⸻

12. SPARQL and engineering propositions are not identical

This is critical.

A raw SPARQL result answers a question about represented RDF facts.

It does not necessarily establish the engineering proposition the user intended.

For example:

ASK {
  :remediation :mayInvoke+ :gateway .
}

returning true establishes a permitted invocation path.

It does not establish:

Restricted document content can reach Gateway.

unless the models also represent payload propagation.

Therefore MAGE’s agent-facing query process must distinguish:

natural-language engineering question
                ↓
required distinctions
                ↓
are those distinctions represented?
        ↓ yes             ↓ no
      query          NOT ANSWERABLE

not-answerable is a first-class result, not an error.

Example:

{
  "status": "not-answerable",
  "reason": "missing-distinction",
  "missing": ["payload-propagation"],
  "models": ["service-flow", "data-policy"]
}

This is one of the most important pedagogical behaviors of the workbench.

⸻

13. Query resolution pipeline

The complete query flow should be:

User engineering question
        ↓
External coding agent
        ↓
Inspect model purpose / represents / omits
        ↓
Formulate SPARQL query
        ↓
MAGE validates supported syntax
        ↓
Query RDF Dataset
        ↓
Can ordinary RDF/SPARQL answer it?
        │
     yes│                    no
        ▼                     ▼
SPARQL evidence        analysis request
                              ↓
                      analysis compiler
                              ↓
                   direct / graph / SMT
                              ↓
                         evidence
        └──────────────┬──────────────┘
                       ▼
                 Result object
                       ↓
            visible MAGE evidence
                       ↓
             Agent explanation

The agent determines the engineering interpretation. MAGE determines facts and formal consequences.

⸻

14. Direct computation versus SMT

Do not force every question through SMT.

Use the least complicated deterministic mechanism that preserves the defined semantics.

Examples:

"what invokes gateway?"
        → RDF lookup / SPARQL
"is gateway reachable?"
        → SPARQL property path / graph algorithm
"what is peak memory across these enumerated configurations?"
        → direct deterministic arithmetic
"is there an execution satisfying these guards
 while latency <= 500ms and memory <= 512MB?"
        → SMT

The invariant is:

Specialized implementations and SMT implementations SHALL implement the same MAGE semantics.

Optimization must not create a second semantics.

⸻

15. SMT lowering

SMT should be used when a query requires finding or ruling out assignments satisfying interacting constraints.

Good candidates include:

* bounded behavioral reachability;
* guards and finite variables;
* cross-model constraints;
* path feasibility with quantitative predicates;
* configuration synthesis;
* symbolic parameters;
* requirements quantified over parameter ranges;
* counterexample generation.

The pipeline is:

MAGE IR + relevant RDF-selected facts + query
                    ↓
               SMT compiler
                    ↓
              SMT-LIB semantics
                    ↓
                  solver
                    ↓
        SAT / UNSAT / UNKNOWN
                    ↓
        MAGE evidence reconstruction

The solver model is never the user-facing answer.

A SAT assignment should be reconstructed as:

* path;
* execution trace;
* configuration;
* parameter assignment;
* witness.

An UNSAT result may establish absence only when the encoding is complete for the claimed scope.

⸻

16. Behavioral SMT encoding

For bounded transition reasoning, use ordinary bounded-model-checking style encoding.

For each step i:

state_i
variables_i
transition_i

and assert:

Initial(state_0, variables_0)
Transition(
    state_i,
    variables_i,
    transition_i,
    state_i+1,
    variables_i+1
)
Query(...)

Finite integer/enumeration variables map naturally into SMT.

A question such as:

Can published be reached with retry_count > 2 while accumulated cost ≤ $0.10?

becomes a bounded satisfiability query.

SAT gives the trace.

⸻

17. Paths, cycles and aggregation

This is where I would slightly modify the implementation agent’s recommendation.

We should not put selector: max|min|named into the fundamental relation/query IR merely to repair execution-path.

Instead distinguish three concepts:

1. graph path query;
2. execution trace;
3. aggregation over a selected/set of traces.

A named path can certainly be supported as a convenient model artifact:

paths:
  successful-remediation:
    states:
      - waiting
      - processing
      - reviewed
      - published

But max latency should be an analysis question, not a special kind of path object.

For finite reachable configuration graphs:

minimum execution latency
maximum execution latency

are well-defined when the relevant terminating executions are bounded.

If a behavioral loop strictly advances bounded state, such as:

retry_count:
  range: [0, 3]

the reachable configuration graph is finite even though the state diagram contains a cycle.

That distinction is excellent and should be taught.

The engine should report the bound responsible for finiteness:

{
  "coverage": {
    "kind": "exhaustive",
    "statesExplored": 17,
    "bounds": {
      "retry_count": [0, 3]
    }
  }
}

If execution-cost accumulation can cycle indefinitely despite finite configurations, maximum accumulated latency can still be unbounded. A finite configuration graph does not by itself make every path aggregate finite, because executions may revisit configurations.

Therefore the correct rule is stronger than the agent proposed:

A maximum additive path quantity is finite only if all reachable cycles capable of participating in the selected executions have zero contribution or are prevented from repeated traversal by bounded monotonic state.

If MAGE can establish the latter by unrolling bounded variables, fine.

Otherwise:

UNBOUNDED
Witness cycle:
    failed → waiting → processing → failed

That is more accurate than simply refusing because the configuration graph contains a cycle.

⸻

18. Expected values

I agree with the implementation agent: expected value belongs in v0.1 because the cache example makes it pedagogically valuable.

But expectation is licensed only when probabilities are represented.

For a branch:

branches:
  hit:
    probability: 0.80
    latency: 5 ms
  miss:
    probability: 0.20
    latency: 250 ms

validation requires:

0 ≤ p ≤ 1
Σ p = 1

for a complete modeled branch set.

Then:

E(latency) = Σ p_i latency_i

If frequencies are omitted:

Expected latency cannot be determined. The model represents hit and miss costs but deliberately omits their frequencies.

Keep that exact behavior. It beautifully demonstrates purposeful omission.

⸻

19. Symbolic quantities and ranges

Support parameters:

parameters:
  gateway_latency:
    dimension: duration
    range: [100 ms, 500 ms]

But I would not design a permanent bespoke interval-expression semantics merely to avoid SMT.

Before SMT is available, the implementation agent’s recommendation is a good Phase-I restriction:

* nonnegative values;
* sum;
* min;
* max;
* multiplication by nonnegative scalar;
* no symbolic subtraction;
* no symbolic division.

This avoids the dependency problem.

Once the SMT backend exists, symbolic parameter questions should preferably lower to solver constraints. Then:

gateway_latency - gateway_latency

is correctly known to be zero because both references denote the same variable.

So treat restricted interval arithmetic as a Phase-I implementation strategy, not a fundamental MAGE semantic limitation.

⸻

20. Requirements

Requirements should reuse the query/evidence machinery.

The agent’s three-status idea is directionally correct, but I’d sharpen the names.

For a requirement R(x) over modeled range D:

SAT(∃x ∈ D : ¬R(x))?
SAT(∃x ∈ D : R(x))?

This yields:

Result	Meaning
satisfied	R holds for every modeled assignment
violated	R fails for every modeled assignment
conditional	R holds for some modeled assignments and fails for others
inconclusive	analysis bounds/resources prevent determination
not-answerable	required distinction is not modeled

I prefer conditional to indeterminate for the range-straddling case because the result is not epistemically indeterminate. We know exactly what happened: satisfaction depends on parameter values.

Then MAGE can answer:

Under what gateway latency does this stay under 750 ms?

with a boundary or satisfying range rather than collapsing it into a Boolean.

⸻

21. Evidence model

Every consequential query result SHALL include evidence and coverage.

Representative result:

{
  "status": "witness-found",
  "query": "...",
  "evidence": {
    "kind": "trace",
    "states": [
      "waiting",
      "processing",
      "failed",
      "waiting",
      "processing",
      "reviewed",
      "published"
    ]
  },
  "coverage": {
    "kind": "exhaustive",
    "statesExplored": 17,
    "bounds": {
      "retry_count": [0, 3]
    }
  }
}

Core statuses should include:

witness-found
counterexample-found
established
refuted
conditional
unbounded
bounded-inconclusive
not-answerable
invalid

Never reduce these to Boolean.

⸻

22. represents and omits

Purposeful reduction should be machine-visible.

Example:

models:
  service-flow:
    represents:
      - service-identity
      - permitted-invocation
    omits:
      - payload
      - runtime-observation
      - latency

These values should come from a controlled vocabulary where possible.

Validation:

* an explicitly omitted distinction represented by the model is an error;
* a declared represented distinction for which the model contains no supporting structure is at least a warning.

The agent uses these declarations to decide whether an engineering question can be answered.

⸻

23. Transactions and hypotheses

Agent modifications SHALL occur through transactions over the typed MAGE IR.

authoritative model
       │
       + transaction
       ↓
temporary model
       ↓
normalize
       ↓
validate
       ↓
RDF projection
       ↓
hypothesis

No public unrestricted setState.

Transactions:

* identify base semantic hash;
* apply atomically;
* preserve stable IDs;
* validate complete resulting system;
* either commit entirely or fail entirely.

Hypotheses use the same machinery but do not replace authoritative state until committed.

Queries can target either:

main
hypothesis/cache-128
hypothesis/cache-256

⸻

24. Agent interface

window.mage remains the primary agent interface.

Representative capabilities:

await window.mage.describe()
await window.mage.context()
await window.mage.system()
await window.mage.model(id)
await window.mage.sparql(query)
await window.mage.analyze(request)
await window.mage.propose(transaction)
await window.mage.hypothesize(transaction)
await window.mage.commit(id)
await window.mage.discard(id)
await window.mage.select(id)
await window.mage.focus(id)

describe() tells a generic coding agent:

* MAGE version;
* YAML schema;
* MAGE vocabulary;
* RDF namespace;
* supported SPARQL subset;
* analysis capabilities;
* transaction schema;
* result/evidence schema;
* instructions concerning represents and omits.

The external agent talks to this API through the live page using CDP.

MAGE contains no LLM.

⸻

25. Accessibility

The entire application SHALL meet WCAG 2.1 AA and applicable ADA Title II requirements.

This is independent of agent access, although the implementations reinforce each other.

Every interactive element SHALL have:

* accessible name;
* appropriate native role where possible;
* state/value exposure;
* keyboard operation;
* logical focus order;
* visible focus;
* non-color-only status representation.

Every graphical model SHALL have an equivalent structured textual/semantic representation.

An SVG relation that visually says:

Remediation → Gateway

cannot be the sole representation of that fact.

Model objects should expose stable IDs in the accessible DOM:

data-mage-id="entity:gateway"
data-mage-kind="service"

Query evidence, errors, hypotheses and analysis results must be accessible without interpreting SVG geometry.

The accessibility DOM is useful to generic automation, but window.mage remains the authoritative structured agent interface.

⸻

26. Browser architecture

Everything remains client-side:

                        Browser
┌──────────────────────────────────────────────────┐
│                                                  │
│ YAML source                                      │
│    ↓                                             │
│ YAML parser / schema validation                  │
│    ↓                                             │
│ Typed MAGE IR                                    │
│    ├──────────────→ RDF Dataset                  │
│    │                    ↓                        │
│    │                 SPARQL                      │
│    │                                             │
│    ├──────────────→ analysis compiler            │
│    │                    ↓                        │
│    │                SMT Worker                   │
│    │                                             │
│    ├──────────────→ renderer → SVG + a11y DOM    │
│    │                                             │
│    └──────────────→ IndexedDB                    │
│                                                  │
│ window.mage                                      │
└──────────────────────────────────────────────────┘
          ↑
          │ CDP
          │
   external coding agent

Expensive analysis and layout SHALL run outside the UI thread.

⸻

27. Recommended browser libraries

I checked the current ecosystem rather than guessing.

YAML: yaml by eemeli. It runs in modern browsers, provides document/AST-level APIs, and can preserve comments and blank lines; it also exposes source/CST tokens when needed. That fits our requirement that agent edits not gratuitously destroy human formatting.  

RDF representation/store: RDF/JS interfaces + N3.js. RDF/JS gives us interoperable JavaScript interfaces for RDF terms, quads and datasets; N3.js implements the RDF/JS model and supplies an in-memory store plus Turtle/TriG/N-Triples/N-Quads parsing/writing, and works in browsers.  

This also means Turtle can remain available as a debugging/export format almost for free, without becoming a student-facing format.

SPARQL: Comunica. Comunica has a browser implementation and can query RDF/JS sources directly, including an N3 store. That is a strong fit for our canonical RDF Dataset.  

I would start with Comunica rather than writing even a “small” SPARQL evaluator. A subset is enforced at MAGE’s validation boundary, not by reimplementing the language.

SMT: z3-solver. The current package ships Z3 as WebAssembly and explicitly supports browser initialization. One deployment wrinkle matters: it uses threads/SharedArrayBuffer, so browser hosting requires the relevant cross-origin isolation headers, and its worker artifacts need appropriate bundling/serving. We should test that against the static MAGE hosting environment very early.  

That is the one library choice I would treat as a feasibility spike before committing the architecture.

Graph layout: ELK.js. It provides browser-side graph layout, including layered layouts appropriate to directed software diagrams, supports ports, and supports Web Worker execution. It deliberately only computes layout, leaving SVG semantics/rendering to us, which is exactly what we want.  

I would not use Mermaid or PlantUML internally. ELK computes coordinates; MAGE owns the accessible semantic SVG.

For persistence, native IndexedDB is sufficient. A small wrapper such as Dexie would be reasonable, but it is not architecturally important.

⸻

28. Canonical hashing

The semantic revision hash SHALL be calculated over a canonicalized form of the typed semantic IR, not YAML bytes and not rendered RDF serialization.

Therefore these do not change semantic identity:

* comments;
* whitespace;
* YAML key ordering;
* view layout.

Semantic changes do.

RDF projection should be deterministic from the canonical IR.

⸻

29. What the implementation agent’s questions resolve to

Most are now answered by the spec:

① Which path? Accepted in substance, but don’t make max|min|named a fundamental execution-path selector. Distinguish paths/traces from analyses over them. Bounded monotonic variables can license finite unrolling; positive repeatable cycles can make additive maxima unbounded, which should produce a cycle witness.

② Are quantities state? Accepted exactly. No. Quantities are annotations evaluated over configurations/executions. Real-valued annotations do not enter the finite state vector.

③ Units are a type system. Accepted. Add dimensional typing and normalization, including ratio.

④ Memory versus latency. Accepted. This is a useful semantic distinction: memory principally over configurations; latency/cost principally over executions.

⑤ Expected. Accepted for v0.1. Require complete declared branch probabilities summing to one; otherwise not-answerable. Keep the cache refusal example.

⑥ Interval correlation. Accepted as a Phase-I restriction only. Monotone nonnegative interval expressions are safe before SMT. Once Z3 is integrated, symbolic relationships should retain identity and go through SMT rather than remain deliberately imprecise.

⑦ Requirement statuses. Accepted with one terminology adjustment: use conditional rather than indeterminate when we have established that some modeled values satisfy and others violate. Reserve inconclusive for incomplete analysis.

Addressing. Accepted. All annotations target stable typed IDs and are existence-checked.

Model metrics. Accepted. Reserved metrics.* namespace.

⸻

30. One implementation-order change I would make

Given the RDF/SPARQL decision, I would not let Phase I grow too much bespoke query machinery before RDF exists.

I’d implement in this order:

1. YAML → typed MAGE IR + validation
2. Typed IR → RDF Dataset
3. RDF Dataset → SPARQL via Comunica
4. Basic structural rendering
5. Finite state-machine configuration exploration
6. Quantitative annotations + units
7. Direct deterministic quantitative analyses
8. Hypotheses / transactions
9. Z3 feasibility spike
10. SMT lowering for symbolic/cross-model questions
11. window.mage + CDP acceptance test
12. full accessibility acceptance pass

The reason is architectural: SPARQL should become the ordinary language of questions before we start accumulating special-purpose APIs such as reachable(), successors(), servicesHandling(), etc. Those may exist internally as optimizations, but agents shouldn’t have to learn them.

The resulting conceptual kernel is unusually small:

YAML gives agents a convenient typed way to construct purposeful models. RDF expresses the consequential relations those models preserve. SPARQL asks standard questions of those relations. Small deterministic analyses handle straightforward model semantics. SMT handles questions requiring symbolic feasibility. Every answer comes back as evidence in terms of the original model.

That feels very aligned with the MAGE premise: we are building just enough formal machinery to make important engineering questions cheap, rather than building another language in which to implement the software.
