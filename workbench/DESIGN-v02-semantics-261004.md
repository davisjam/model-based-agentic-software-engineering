# DESIGN — MAGE Model Workbench v0.2: semantics and modeling strategy (261004)

**Author's specification, landed verbatim below.** Received 261004 as a deliberate fresh start on the
underlying semantics and modeling strategy, superseding the v0.1 framing where the two conflict. The
governing rule is §34; the decisive G5 resolution is its closing paragraph.

**Status: NORMATIVE for v0.2. Three tensions against shipped artifacts were recorded at landing; two
are now resolved and one remains open.** The tensions were listed rather than silently fixed, because
each is a place where a landed document or constant said something this spec contradicts — and
leaving a contradiction unnamed is the defect class this project spent 261004 removing.

1. **Liveness was an explicit non-goal and this spec reverses it. — RESOLVED by the landing commit
   itself (`f3a9991c`).** This spec requires LTL including liveness (§8, §30's P5) while keeping
   **fairness** out of scope (§11), and both affected artifacts carry the split: `PLAN.md`'s
   must-not now reads "implement fairness" alone with the liveness half marked superseded and the
   consequence stated (`PLAN.md` §2 "Must not", `:414-426`), and
   `DESIGN-expressiveness-261004.md:257` marks its LTL/Büchi rejection superseded while retaining
   fairness. Its measured findings (nineteen forms,
   the `recurrence`/`repeatable-cycle` distinction, state-space sizes) stand.
2. **§17 lists `exhausted` among query results. — RESOLVED 261004: a category slip, corrected in
   §36.1.** `Outcome` is four-valued (`src/ir/types.ts:666`) and `exhausted` is the SPARQL
   evaluator's own word (`src/sparql/eval.ts:71`), on the surface §29 demotes to diagnostic. §36.1
   carries the correction and the reasoning; §17's verbatim text is left as the author wrote it.
3. **§30's P5 is likely REFUTED as written, and that may be the point. — OPEN, and deliberately
   held.** "Every proposed transaction eventually commits or refuses" is liveness, and §11 admits
   all executions with no fairness — so a trace that sits in `valid` forever refutes it. §27's own
   worked counterexample shows exactly that shape (`valid → valid → valid → …`). The acceptance
   suite should state P5's expected verdict; if the answer is `refuted`, say so, because a
   starvation counterexample a student can see is a stronger lesson than a property that quietly
   holds. The verdict belongs with the LTL semantics rather than with an editorial note, so it is
   ruled in `DESIGN-v02-ltl-foundation-261004.md` and not here.

**§1–§34 below are the author's verbatim text. §35 and §36 are editorial additions**, each dated and
attributed at its head: §35 records the author's 261004 ruling on how the Workbench stands toward
SysML v2 and KerML, and §36 carries corrections to the verbatim text.

---

Yes. I think v0.2 can now have a much firmer specification. The key move is to stop treating “query language” as an isolated Workbench feature. The Workbench has a small semantic model, derived from the SysML v2/KerML architecture, and queries are expressions over that model. LTL extends the behavioral expression language where ordinary reachability is insufficient.

SysML 2.0 and KerML 1.0 are now formal OMG standards, with KerML explicitly providing the semantic/syntactic foundation for SysML v2. SysML also normatively provides Systems, Analysis, Quantities-and-Units, and Requirement-Derivation libraries.  

MAGE Model Workbench v0.2

Educational semantic modeling and verification

1. Goal

Workbench v0.2 supports three activities:

Model an engineering system visually. Ask semantically meaningful questions of the model. Pin important answers as properties that are rechecked when the model changes.

It is not an implementation of SysML v2. It adopts a deliberately small subset of SysML/KerML concepts and their semantic distinctions.

The student should be able to learn the entire modeling vocabulary in one lecture.

The underlying semantics should nevertheless be strong enough that these are meaningful statements:

A depends on B
Restricted data can reach Service X
Every request eventually receives a response
Once a hypothesis is disposed, it never becomes authoritative
The worst-case latency of successful executions is 1.8 s
Requirement R is violated by this model

The first four are not annotations on pictures. They have model-theoretic meanings and can be evaluated.

⸻

2. Semantic architecture

I would make this the normative v0.2 architecture:

                    MAGE Workbench
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    Structure         Behavior         Quantity
        │                │                │
   relations       transition         measures /
    + sets          systems             units
        │                │                │
        └─────────── bindings ────────────┘
                         │
                   expressions
                         │
              ┌──────────┴──────────┐
              │                     │
            query                property
        "what is true?"       "pin this answer"
                                    │
                               requirement
                           "what must be true?"
                                    │
                              verification

This follows the useful SysML/KerML separation rather than copying its syntax.

SysML itself distinguishes requirements and cases; a case is a calculation intended to achieve an objective concerning a subject, with specialized analysis and verification cases.  

⸻

3. The SysML/KerML subset

I would take eight concepts.

SysML/KerML concept	Workbench concept	Student-visible?
PartDefinition / PartUsage / feature membership	Entity/type	Yes, simplified
Connections / flows / relationships	Relation	Yes
Behavior / state/action concepts	Machine	Yes
Succession / transition	Transition	Yes
Expressions / predicates	Query expression	Yes, simplified
Binding	Binding	Yes
Requirement definition/usage	Requirement	Yes
Analysis/verification case	Query/property verification	Mostly hidden
Quantity/Unit libraries	Quantity + unit	Yes

We do not take:

* SysML packages/import machinery as a student concept
* specialization hierarchies beyond simple entity types
* ports/interfaces unless a scenario earns them
* full KerML feature semantics
* full KerML expression syntax
* use cases
* action language
* allocations
* metadata language
* cause/effect library
* geometry
* full calculation definitions
* SysML textual syntax
* SysML interchange syntax

Those are outside the educational problem.

⸻

4. Common semantic universe

This is the largest change I would make conceptually.

v0.1 has three model types. v0.2 should retain the three forms, but they belong to one workspace semantic universe.

A workspace W contains:

W=(E,R,M,Q,B,P,Req)

where:

* E: engineering entities
* R: typed relations among entities
* M: behavioral machines
* Q: quantitative measures
* B: bindings among model elements
* P: pinned properties
* Req: requirements

A purposeful model remains a reduction: it contains only the subset needed for its engineering question.

This is important because purposeful reduction survives. We aren’t making one giant SysML system model.

⸻

5. Model Form 1: Structure

Engineering question

What is connected to what?

Student-visible concepts

entity
relation
attribute

Optionally:

type

That’s enough.

A structural model denotes a finite typed relational structure:

S=(E,R,A)

with entities E, typed binary relations

r\subseteq E\times E

and attributes:

a:E\rightharpoonup V.

Example

type: structural-graph
entities:
  - id: web
    type: service
  - id: api
    type: service
  - id: database
    type: datastore
relations:
  depends-on:
    - [web, api]
    - [api, database]

The YAML can remain Workbench-native. Do not expose SysML syntax.

Required structural operations

v0.2 should support:

elements
related
reachable
path
exists
all
select
count

The existing facade already exposes elements, related, reachable, path, and violations, and is designed to remain derived from QuerySemantics. workbench-open-questions-261004.md

Add quantification rather than generic piping.

Semantics

related(r,a,b):

(a,b)\in r

reachable(r,a,b):

(a,b)\in r^+

path(r,a,b) returns a witness sequence if one exists.

select(E,P):

\{e\in E\mid P(e)\}

exists(E,P):

\exists e\in E:P(e)

all(E,P):

\forall e\in E:P(e)

These are ordinary relational/predicate operations.

⸻

6. Model Form 2: Behavior

Engineering question

What behavior can occur over time?

The existing name state-machine is fine as a serialization kind.

The semantic object is a labeled transition system:

M=(S,S_0,T,L)

where:

* S: states
* S_0\subseteq S: initial states
* T\subseteq S\times Event\times S: transitions
* L:S\rightarrow2^{AP}: atomic propositions true in each state.

Student model

type: state-machine
machine:
  id: transaction
  entity: transaction-engine
  initial: idle
  states:
    - idle
    - proposed
    - valid
    - committed
    - refused
  transitions:
    - from: idle
      event: propose
      to: proposed
    - from: proposed
      event: validate
      to: valid
    - from: valid
      event: commit
      to: committed

This remains drawable as an ordinary state-machine diagram.

⸻

7. Behavioral queries, level 1

Students should not need LTL for easy questions.

Provide:

state-reachable(machine, state)
transition-possible(machine, from, event, to)
can-eventually(machine, proposition)
can-reach(machine, from, to)

These compile to ordinary graph/transition-system analysis.

Examples:

state-reachable(transaction, committed)
can-reach(transaction, proposed, refused)

This keeps Week 1 of behavior comprehensible.

⸻

8. Behavioral queries, level 2: LTL

v0.2 should support real LTL, not an LTL-inspired mini-language whose semantics we own.

But provide a friendly surface.

Minimum operators:

Student spelling	LTL	Meaning
not P	¬P	P does not hold
P and Q	P ∧ Q	both
P or Q	P ∨ Q	either
next P	X P	P in next state
eventually P	F P	P sometime later
always P	G P	P at every future state
P until Q	P U Q	P until Q occurs
P implies Q	P → Q	implication

That is enough. Don’t invent more temporal operators initially.

Example

Every proposed transaction eventually becomes committed or refused.

Friendly:

always (
    proposed implies
    eventually (committed or refused)
)

LTL:

G(proposed\rightarrow F(committed\lor refused))

Safety

Once disposed, a hypothesis can never become authoritative.

If disposed persists:

G(disposed\rightarrow G\neg authoritative)

or model the appropriate propositions/events precisely.

Response

Every request eventually receives a response.

G(request\rightarrow F(response))

Ordering

Commit cannot occur before validation.

Could be expressed temporally, although where a simpler machine invariant suffices we should prefer it.

⸻

9. LTL evaluation semantics

This must be explicit.

A machine denotes traces:

Traces(M).

A behavioral property P holds iff:

\forall\pi\in Traces(M):\pi\models P.

It is refuted iff:

\exists\pi\in Traces(M):\pi\not\models P.

And when refuted, return a counterexample trace.

This is pedagogically fantastic.

The visualizer should animate/highlight:

Idle
 ↓ propose
Proposed
 ↓ validate
Valid
 ↓ refuse
Refused
 ↓ ...
Authoritative    ← PROPERTY VIOLATED HERE

That turns model checking into something an undergraduate immediately understands.

Implementation

The implementation may compile LTL to Büchi/ω-automata and perform product-automaton emptiness checking.

But:

Büchi automata are implementation machinery, not a Workbench model form.

The student learns state machines and temporal properties.

⸻

10. Finite versus infinite traces

This needs a v0.2 ruling.

LTL conventionally operates over infinite traces.

Educational state machines frequently terminate.

I recommend the standard practical interpretation:

Terminal states stutter forever.

Thus:

Committed → Committed → Committed → ...

This gives every execution an infinite trace and preserves ordinary LTL semantics.

Document this explicitly.

Do not invent three-valued finite-trace LTL for v0.2.

⸻

11. Fairness

Out of scope for v0.2.

Otherwise:

G(request\rightarrow F(response))

may fail merely because the scheduler can eternally postpone an enabled transition.

That’s real, but it opens fairness assumptions immediately.

For v0.2:

* all transition-system executions are admitted;
* no implicit fairness;
* counterexamples expose starvation where it exists.

Add fairness only when a real educational scenario demands it.

⸻

12. Model Form 3: Quantity

Engineering question

What does an execution cost?

“Cost” includes:

* time
* money
* memory
* energy
* requests
* tokens
* bytes

SysML 2.0 normatively ships Quantities-and-Units and Analysis Domain libraries, so this is exactly the sort of distinction worth borrowing.  

A quantity is:

q:D\rightarrow V_U

where D is its measurement domain and V_U is a value with unit U.

Student form

type: quantitative-model
quantities:
  - id: latency
    unit: ms
    domain: execution
  - id: model-cost
    unit: USD
    domain: execution

Required operations

value
sum
min
max
mean
count

Maybe:

percentile

but not v0.2 unless an actual scenario needs it.

Units must be checked.

This must fail admission:

latency + cost

unless there is some semantically meaningful typed operation, which there isn’t.

⸻

13. Executions become the bridge

The most important cross-model concept is execution.

Behavior defines which executions exist.

Quantity measures them.

So:

Exec(M)

is the execution domain admitted by behavioral model M.

A behavioral predicate P selects:

Exec_P(M)=
\{e\in Exec(M)\mid e\models P\}.

Then quantity evaluation operates over that set:

max_{e\in Exec_P(M)} latency(e).

This formalizes the existing executions-selected-by-behaviour composition rather than replacing it.

⸻

14. Bindings

v0.2 should formally split the current joins concept.

There are bindings and compositions.

Binding

A binding establishes correspondence among model elements.

It does not evaluate a query.

Current examples:

appears-in
machine-of-entity

become explicit bindings.

Example:

bindings:
  - kind: describes
    behavior: transaction-lifecycle
    entity: transaction-engine

Semantically:

subject(transactionLifecycle)=transactionEngine

The current Workbench evidence supports exactly this use: the proposed transaction/hypothesis model is about state-bearing code whose invariants are currently held only point-wise by tests. workbench-open-questions-261004.md

Binding rules

Bindings are:

* typed,
* directional where semantics require it,
* checked for referential validity,
* not query operations,
* not generic equality.

Do not tell students that every binding means mathematical identity.

⸻

15. Composition

Composition means:

A semantic result from one model participates in evaluating an expression over another.

v0.2 initially admits exactly one cross-form composition:

Behavior → Quantity

executions satisfying behavioral predicate P
       ↓
quantity aggregation

Example:

max latency
of executions
where eventually remediated

Formally:

max\{latency(e)\mid e\models F(remediated)\}.

That is enough.

⸻

16. Do not add generic cross-model join

This is now a firm v0.2 design decision.

No:

pipe
join
flatMap
fold

across model forms.

Within a semantic domain, ordinary operations are fine:

select
exists
all
sum
max

Cross-domain composition requires a registered semantic operation.

This is stronger and cleaner than the existing G5 rationale, which currently frames the boundary as “closed in-operation grammars” and no piping/joining/folding. workbench-open-questions-261004.md

The new rationale is:

Cross-form operations require defined semantics, not merely compatible data representations.

⸻

17. Queries

A query asks:

What does the model entail?

Queries are declarative propositions or value-producing expressions.

v0.2 has three result categories.

Proposition

reachable(A,B)

Result:

holds
refuted

plus potentially:

inconclusive
unlicensed
exhausted

Preserve the existing verdict vocabulary.

Witness-bearing proposition

Existential:

exists path ...

returns:

holds
witness: [...]

Universal refutation:

all services ...

returns:

refuted
counterexample: service-x

Value query

max latency ...

returns:

value: 1840
unit: ms

The result type is statically determined from the expression.

⸻

18. Properties

A property is a query whose expected result is pinned.

This matches what the current Workbench already does successfully: every tracked model query carrying expect is evaluated by the coverage gate, while the gate explicitly does not claim model-to-code correspondence. workbench-open-questions-261004.md

Example:

property:
  id: database-unreachable-from-browser
  query:
    reachable:
      relation: depends-on
      from: browser
      to: database
  expect: refuted

Or:

property:
  id: requests-eventually-complete
  query:
    ltl:
      machine: request-lifecycle
      formula: "G(request -> F(completed))"
  expect: holds

Every property must be rerun on every model change.

That is the core educational loop.

⸻

19. Requirements

Keep the existing polarity distinction.

A requirement is normative:

requirement:
  id: no-restricted-data-to-impermitted-subscriber
  statement: >
    No restricted event may reach a service
    not permitted to process it.
  expressed_as:
    query: restricted-data-reaches-impermitted-subscriber
  satisfied_when: refuted

The underlying query remains positive:

There exists restricted data reaching an impermitted subscriber.

The current fixture already uses exactly this distinction, with holds meaning the breach exists and the requirement satisfied on refuted. workbench-open-questions-261004.md

This is good design. Preserve it.

⸻

20. Verification

A verification is:

verify(requirement,model)\rightarrow verdict.

Workbench result:

satisfied
violated
inconclusive
error

I would distinguish this vocabulary from raw query results.

That gives:

QUERY
holds | refuted | inconclusive | ...
          ↓ interpreted against
REQUIREMENT
satisfied_when: holds/refuted
          ↓
VERIFICATION
satisfied | violated | inconclusive | error

This mirrors SysML’s useful separation of requirement from verification case without importing the whole case apparatus. SysML defines cases as calculations concerning a subject/objective and specializes them into analysis and verification cases.  

⸻

21. Query syntax: two surfaces, one AST

Keep the current architecture.

Canonical typed document

This is authoritative.

Something approximately:

type Query =
  | StructuralQuery
  | BehavioralQuery
  | QuantityQuery;

Structural:

type StructuralExpr =
  | Elements
  | Related
  | Reachable
  | Path
  | Exists
  | All
  | Select
  | Count;

Behavior:

type BehaviorExpr =
  | StateReachable
  | TransitionPossible
  | LTL;

Quantity:

type QuantityExpr =
  | Value
  | Sum
  | Min
  | Max
  | Mean
  | Count;

Cross-type composition is not another arbitrary expression constructor. It is admitted through registered typed semantic operations.

⸻

22. Agent/human facade

Ship G1.

The facade should remain generated/derived from the semantic registry:

mage.model.elements(...)
mage.model.related(...)
mage.model.reachable(...)
mage.model.path(...)
mage.behavior.reachable(...)
mage.behavior.checkLTL(...)
mage.quantity.max(...)
mage.quantity.mean(...)
mage.verify(...)

Maybe namespace naming deserves bikeshedding, but the principle does not.

The facade is ergonomics. The typed query AST remains the authority. That’s already the intended Workbench architecture. workbench-open-questions-261004.md

⸻

23. QuerySemantics v0.2

This is where I’d make the largest implementation change.

Today QuerySemantics carries forms, primitives, interpretations, licensing, and composition.

Add explicit semantic-domain metadata:

interface QuerySemantics {
    domain: SemanticDomain;
    forms: readonly QueryForm[];
    primitives: ...;
    interpretedBy: ...;
    licensedBy: ...;
    bindings: ...;
    compositions: ...;
}

And:

type SemanticDomain =
    | RelationalDomain
    | TransitionSystemDomain
    | QuantityDomain;

Each must specify:

denotation
atomic values
operations
result types
equality
witness form
counterexample form

This answers the question the current registry does not quite state:

What does this model denote?

⸻

24. Totality rules

Keep and strengthen the current totality discipline.

For every registered model form:

1. It has exactly one semantic domain.
2. Every query form has an interpretation.
3. Every primitive is classified.
4. Every primitive has a result type.
5. Every primitive declares whether it can produce a witness/counterexample.
6. Every binding has typed source and target domains.
7. Every composition has typed input/output domains.
8. Every student-visible facade operation derives from a registered primitive.
9. No operation exists only in the facade.
10. No semantic operation exists only in documentation.

A new form cannot land unclassified.

That’s excellent architecture already. Keep it.

⸻

25. Admission before evaluation

Every query passes:

parse
  ↓
type
  ↓
license
  ↓
evaluate

Type checking

Reject:

reachable(42, "foo")

or:

latency + service

Licensing

Even a type-correct expression may be unlicensed for a purposeful model because the model deliberately omits the required information.

Then:

unlicensed

rather than false.

This distinction is essential to purposeful reduction.

⸻

26. Three-valued knowledge is not three-valued logic

Be careful here.

inconclusive and unlicensed are evaluation outcomes, not truth values in the underlying logic.

For an admitted proposition:

P\lor\neg P

remains classical.

Workbench can fail to establish either because evaluation is incomplete, bounded, unsupported, etc.

Do not build Kleene logic into v0.2 accidentally.

⸻

27. Counterexamples become first-class UI

Every refuted universal or LTL property should try to produce a counterexample.

Every satisfied existential should try to produce a witness.

So:

STRUCTURE
restricted data reaches impermitted service
Witness:
Publisher → Topic X → Service B

and:

BEHAVIOR
G(proposed → F(committed ∨ refused))
Counterexample:
idle
→ proposed
→ valid
→ valid
→ valid
→ ...

The visual model highlights the witness/counterexample.

This should be a headline v0.2 feature because it connects formal semantics directly to the visual educational goal.

⸻

28. Change checking

This becomes extremely clean.

On every edit:

Model edit
    │
    ▼
Parse / validate
    │
    ▼
Evaluate pinned properties
    │
    ├── unchanged
    │
    ├── newly satisfied
    │
    └── newly violated

UI should distinguish:

✓ still holds
✓ newly holds
✕ newly refuted
? inconclusive
○ unlicensed

The important event is verdict transition.

For example:

restricted-data-reaches-impermitted-subscriber
BEFORE: refuted
AFTER:  holds
Requirement:
no-restricted-data-to-impermitted-subscriber
BEFORE: satisfied
AFTER:  violated

That is exactly what students should see when they draw one dangerous edge.

⸻

29. SPARQL

Demote it firmly.

window.mage.debug.sparql is correct.

SPARQL queries the RDF representation. It does not define Workbench semantics.

Thus:

MAGE semantic query language
        ↓
canonical model semantics

is normative.

RDF projection
        ↓
SPARQL

is diagnostic/escape-hatch functionality.

Ratify G2 on that basis.

⸻

30. The fourth self-model should become the v0.2 behavioral acceptance test

Build it.

The current artifact identifies precisely the right claims: transaction lifecycle, hypothesis branch, shared workspace, and interleaving properties that point-wise tests do not state. workbench-open-questions-261004.md

I would require v0.2 to express at least:

P1: committed is reachable
P2: refused is reachable
P3: stale-base transactions never commit
P4: disposed hypotheses never become authoritative
P5: every proposed transaction eventually commits or refuses

P1/P2 test ordinary behavioral reachability.

P3/P4 test safety LTL.

P5 tests liveness LTL.

That’s a beautiful semantic acceptance suite.

⸻

31. Three required teaching examples

v0.2 should ship with exactly three flagship examples matching the forms.

A. Message bus

Teaches:

structure
relations
reachability
quantification
requirements
witnesses

Key property:

restricted data reaches an impermitted subscriber

B. Transaction/workspace

Teaches:

behavior
states
transitions
bindings
LTL
counterexamples

Key property:

G(proposed\rightarrow F(committed\lor refused))

C. Processing pipeline

Teaches:

quantity
units
executions
behavior → quantity composition
analysis
requirements

Key property:

max\{latency(e)\mid e\models F(success)\}<2s

Together they exercise essentially the entire semantic subset.

⸻

32. Explicit v0.2 non-goals

I would put these in the design document because otherwise the language will immediately expand.

Not v0.2:

* full SysML compatibility
* importing arbitrary SysML models
* exporting valid SysML
* KerML syntax
* OCL
* CTL / CTL*
* probabilistic temporal logic
* fairness assumptions
* timed automata
* continuous dynamics
* probabilistic models
* stochastic quantities
* user-defined semantic domains
* generic cross-model joins
* arbitrary higher-order functions
* general-purpose programming
* arbitrary recursion
* code generation
* proving model↔implementation correspondence
* full information-flow analysis

Especially preserve the last distinction: the current coverage gate explicitly says evaluating all pinned model properties does not prove correspondence between model and code. workbench-open-questions-261004.md

⸻

33. What changes from v0.1

This is smaller than it first sounds.

v0.1	v0.2
Three independent ModelType dialects	Three forms with explicit semantic domains
joins mixes concepts	bindings and compositions separate
Graph query grammar	Relational expression subset
Basic machine queries	Transition semantics + LTL
Quantity target predicate	Formal Behavior→Quantity composition
Queries + expect	Queries, pinned properties, requirements, verification
Result	Result + witness/counterexample
Implicit denotation	Explicit denotes/semantic-domain contract
SPARQL escape hatch	Explicitly diagnostic only
Query API	Typed AST + derived human/agent facade

The YAML does not need to become SysML-shaped.

The visuals do not need to become SysML diagrams.

The implementation does not need a KerML engine.

The semantic design needs to be able to say:

This concept is a restricted realization of this established semantic idea.

⸻

34. The governing v0.2 rule

I’d put one sentence near the top of the design:

Every Workbench model form denotes a defined semantic object, and every query operation has a defined interpretation over that object. Cross-form reasoning is permitted only through typed bindings and explicitly defined semantic compositions.

Then the educational promise:

If the Workbench lets a student ask a question, the model contains enough semantics to say what that question means.

That is the v0.2 line.

And I think it resolves G5 decisively: we do want substantially more query expressiveness than the earlier design contemplated, including quantification and LTL, but we do not want generic syntactic composition. We add expressive power inside defined semantic domains and typed operations between them. That is a much more principled boundary than “don’t add a pipe until somebody asks for one.”

---

## 35. Borrowed semantics must have provenance (recorded 261004)

*The ruling in §35.1 and the rule in §35.3 are the author's, 261004. The prose, the citations, the
placement recommendation and the enforcement assessment are the recording wave's, read and verified
against `f3a9991c`. §1–§34 above are verbatim author text; this section is not.*

### 35.1 The implementation decision

Implement the educational subset natively in the existing Workbench kernel. Treat the OMG
specifications as normative semantic sources, and the official SysML v2 Pilot Implementation, its
standard libraries and its examples as executable and reference conformance material. Take **no
runtime dependency** on the SysML v2 implementation.

The architecture is four layers, and the arrows say which way authority runs:

```
              OMG specifications — SysML v2, KerML
                  normative semantic source
                              │
            ┌─────────────────┴─────────────────┐
            │                                   │
   Pilot Implementation                   MAGE Workbench
   standard libraries                the small educational subset,
   examples, BNF, XMI                native in the existing kernel
      reference oracle                          │
            │                                   │
            └──────── conformance fixtures ──────┘
                   §35.6 — the join, per construct
```

The specification rules. The Pilot Implementation answers questions about the specification and
governs nothing here. The fixtures are where a correspondence claim stops being a sentence and
becomes an artifact.

### 35.2 What was considered, and what each option would have cost

A declined option with a stated reason is worth more than an unexamined one. Four were weighed.
One of the four is adopted rather than declined, and the table says which.

**Bound on the table's own facts, stated because §35.3 demands it of every other claim here.** The
descriptions of the four artifacts — their stacks, licenses and shapes — are the author's 261004
survey, recorded, not independently verified by the recording wave. In §13's vocabulary they are
`asserted` at that date. Before any of them is relied on for a decision beyond this one — an import
reader, a vendored library, a license review — they get re-read at the source.

| Considered | What it is | Verdict, 261004 |
|---|---|---|
| **SysML v2 Pilot Implementation** | the official reference implementation: Eclipse, Xtext, Java, EPL-2.0 | **Declined as a dependency.** Adopting it means adopting feature/type/specialization machinery, Definition/Usage duality, namespaces and imports, multiplicity, the full expression system, the standard libraries, the textual grammar, and the Xtext/Eclipse/EMF stack. Retained as a **reference oracle** for fixtures. |
| **SysML v2 Release repository** | specifications, BNF, examples, standard libraries, XMI | **Adopted, as conformance material.** "An excellent source of conformance fixtures" — the smallest official model exhibiting a construct is drawn or minimized from here (§35.6). |
| **API and Services implementation** | the model-repository service: REST over Postgres | **Declined.** Grossly heavier than the Workbench needs. The Workbench is a page with a Web Worker and no server at all (§12); a repository service would be infrastructure in front of a tool that has none. |
| **OpenSysML** | an independent implementation in Go | **Not adopted; worth watching.** Possible value later as a *second*, independent conformance oracle — two implementations disagreeing about a construct is the most informative thing a fixture can report. |

The shape of the trade, in the author's terms: *their decades of semantic work, our small educational
language, none of their implementation baggage.*

One practical point decides it more sharply than any row above. **Adopting their engine would not
solve LTL.** The author's reading is that the Pilot Implementation supplies model semantics and not a
model checker, which the recording wave records rather than confirms (`asserted`, 261004). The
configuration-space construction and the temporal evaluation that §8–§11 specify stay ours to write
either way. A runtime dependency would therefore buy a grammar and a type system while leaving the
most interesting new implementation work exactly where it already is.

### 35.3 The rule

**Borrowed semantics must have provenance.** A Workbench construct derived from SysML v2 or KerML
MUST identify the corresponding standard concept, and MUST maintain a conformance fixture
demonstrating the intended correspondence (§35.6). A Workbench extension — including LTL queries and
pinned change properties — MUST be identified as an extension, and MUST NOT be attributed to SysML
or KerML.

**The second half matters as much as the first.** Honest attribution fails in two directions, and the
cheaper failure to make is the one that flatters: a document that credits SysML for the Workbench's
own analysis semantics claims standing it has not earned, and a reader who later checks the standard
finds nothing there. The author's instruction is one sentence: *"We shouldn't falsely attribute
everything to SysML."* The rule is symmetric by construction, which is why §35.4's table carries a
class column on every row rather than footnoting the exceptions.

**The current state of the code is zero attribution, not over-attribution.** Verified at `f3a9991c`:
the strings `SysML`, `KerML` and `semantic_basis` appear nowhere under `src/`, `test/`, `models/`, or
either JSON schema. So the rule's first effect is to introduce a claim where none exists today —
not to correct a false one. That is worth stating, because the opposite reading would make §35.4 look
like a retraction when it is a first record.

**Why this is not minted as a V-rule.** Every V-number in `SEMANTICS.md` is implemented and citable
by an error message, and §13.6's OQ1 declines to mint V40 for exactly this reason: an unimplemented
V-number is itself a claim of enforcement that nothing holds. This rule is held by review today
(§35.5), so it takes a section number in this specification's own scheme and not a validator number.
If the presence half later lands as a type and a test, a V-number becomes available honestly; the
correspondence half never will (§35.5, rung 3).

### 35.4 The semantic basis of each construct

The rows are not all the same kind of claim, so each carries its class.

| MAGE IR construct | Standard | Standard concept, as named in the 261004 ruling | Class | Clause |
|---|---|---|---|---|
| entity / type, relation, attribute | KerML, SysML v2 | typed-element, relationship, feature subsets | **borrowed** | owed |
| machine, state, transition | SysML v2 | behavioral / state / succession subsets | **borrowed** | owed |
| binding | KerML | binding subset | **borrowed** | owed |
| quantity / unit | SysML v2 | Quantities and Units library subset | **borrowed** | owed |
| requirement, verification | SysML v2 | requirement and verification-case subsets | **borrowed** | owed |
| relational query | — | Workbench analysis semantics | **extension** | n/a |
| LTL query | — | standard linear temporal logic, deliberately outside SysML and KerML | **extension, externally grounded** | n/a |
| pinned property, change checking | — | Workbench mechanism | **extension** | n/a |

**Three classes, and the third is not a hedge.** A borrowed construct is a restricted realization of
an established semantic idea, and the standard is where its meaning is settled. A plain extension has
no foundation outside this project: the relational query vocabulary (ten graph forms,
`src/engine/types.ts:148`) and the pinned-property mechanism are ours, and a reader who goes looking
for them in SysML will not find them. **An externally grounded extension is a third thing.** LTL sits
outside SysML and KerML by choice, yet its semantics are not invented here either — they are standard
linear temporal logic, which is a stronger warrant than "ours" and a different one from "borrowed from
SysML." Collapsing it into either neighbour would misdescribe it in both directions. The foundation
and its evaluation semantics belong to `DESIGN-v02-ltl-foundation-261004.md`; this table cites that
document and does not restate it. That document is a sibling wave's, landing the same day — a reader
at `f3a9991c` will not find it yet.

**The clause column is deliberately unfilled, and stays that way until a fixture fills it.** A clause
citation written from memory is precisely the false attribution the rule forbids, dressed as rigour
— and a wrong clause number is worse than an absent one, because it reads as checked. `owed` is a
commitment with a named discharge point: the fixture's `claim.md` (§35.6) quotes the specification
sentence with its clause, and the table's cell is filled from the fixture rather than the reverse.
Until then the concept column carries the concept *names* the ruling used, which is a weaker and
truthful claim.

### 35.5 Where the provenance is recorded, and what holds it

The author's shape is `semantic_basis: { standard, concept }`, *"not necessarily in student YAML;
this could live entirely in `ModelType`/`QuerySemantics`."* The recommendation below agrees on the
code placement and sharpens it in two ways: the field needs a third arm for §35.4's third class, and
it needs two homes rather than one, because §35.4's rows sit at two different granularities.

**Not in the student YAML, and the reason is stronger than ergonomics.** The claim is about the
*language*, one per construct — not about any particular model. A YAML field would therefore invite N
copies of one language-level fact, free to disagree with each other. The loader settles it anyway:
canonicalization reads five fields out of a provenance block and nothing else
(`src/ir/canonicalize.ts:66-87`), and the IR's `Provenance` carries no such field
(`src/ir/types.ts:152-159`), so a YAML `semantic_basis` would never reach the engine. It would be
annotation in A1's sense (§5.1 of `SEMANTICS.md`) — carried, not interpreted.

**Four homes in `src/engine/model-types.ts`, because the rows sit at several granularities.** Two
when this section was written; the binding/composition split (`DESIGN-v02-examples-and-semantic-completion-261004.md`
§4, landed 261004) built the construct the third bullet below had deferred, and added the fourth.

- **`ModelType.semanticBasis`** (the interface at `src/engine/model-types.ts:258`, the registry at
  `:338`) carries the *substrate* rows: entity/relation/attribute for `structural-graph`,
  machine/state/transition for `state-machine`, quantity/unit for `quantitative-model`. Three
  registered types, and the list is closed by construction (`:51`).
- **`QueryPrimitive.semanticBasis`** (`src/engine/model-types.ts:139`) carries the *form* rows,
  because the borrowed/extension split runs *inside* a single model type. The structural-graph type's
  substrate is borrowed while its query forms are ours; one field on the type could not say both. The
  form vocabularies are the engine's own arrays — ten graph forms (`src/engine/types.ts:148`), six
  behavioral (`:155`), three requirement metrics (`src/quant/requirement.ts:31`).
- **`BindingSemantics.semanticBasis`** carries §35.4's `binding` row, which is BORROWED from KerML
  and so always needed a home. It had none until 261004, and this section recorded the reason
  honestly: binding's nearest object was `JoinSemantics`, §14's binding construct was not yet built,
  and a field there would have described a shape that did not exist. §4 built it — the overloaded
  `joins` census is now `BINDINGS` (three declared correspondences) and `COMPOSITIONS` (one), the
  field is required on both, and the three bindings SHARE one basis object because they are one
  §35.4 row. **Two corrections this supersedes:** the deferral is discharged, and the claim that
  binding is an `extension` row was wrong — §35.4's table classes it `borrowed | KerML | binding
  subset | owed`, which is why it needed a field and the two mechanisms below do not. The subset
  borrowed, and the five things it deliberately does NOT claim, are stated at the basis object.
- **`CompositionSemantics.semanticBasis`** is the fourth home, and the one row §35.4's table has no
  line for: `executions-selected-by-behaviour` is an `extension`, because no SysML v2 or KerML
  construct defines a behavioural predicate restricting a quantitative evaluation domain. Naming
  SysML's analysis-case machinery to make the row look grounded would be §35.3's over-attribution.
- **Pinned property and change checking get no field, and that is the honest placement.** They are
  mechanisms with no registry object at all, and both are `extension` rows — for an extension the
  record in §35.4 *is* the artifact the rule asks for, and minting fields so that a table has
  somewhere to point would be the decoration this repo declined once already (`PLAN.md` §0.2a,
  `:108-114`).

**The shape, with the third arm.** A discriminated union, so the three classes are distinguishable by
a reader and exhaustible by the compiler:

```ts
export type SemanticBasis =
  | { readonly kind: "borrowed"; readonly standard: "SysML v2" | "KerML";
      readonly concept: string; readonly clause: string;
      /** The conformance fixture directory (§35.6), or null while the obligation is still owed. */
      readonly fixture: string | null }
  | { readonly kind: "extension"; readonly why: string }
  | { readonly kind: "extension-grounded"; readonly foundation: SchemaAuthority;
      readonly why: string };
```

`clause` and `fixture` sit on the `borrowed` arm alone, so no extension row can carry either and no
borrowed row can omit them. `extension-grounded` reuses `SchemaAuthority`
(`src/engine/model-types.ts:58`) rather than a free string, so LTL's foundation is a citation the
registry's existing tests already know how to check for existence.

**`fixture: string | null`, and the null is a commitment rather than an escape.** A non-nullable
`fixture` would read better and would block the field from landing at all until the corpus exists,
which gets the order wrong: the attribution is useful immediately and the fixture is the slower half.
So `null` means *owed*, matching §35.4's `owed` clause column, and it is exactly where the rule's
fixture requirement is recorded-but-not-discharged — `asserted`, in rung 3's sense. If the owed count
needs to stop growing, the cheap control is a ratchet: a test pinning the number of `null` fixtures at
or below its current value, so a new borrowed construct cannot be added without discharging one. Not
built here; named so it is a choice later rather than a rediscovery.

**Now the question this project always asks next: what would hold it?** Three rungs, assessed rather
than asserted.

**Rung 1 — presence: the compiler, and a new totality rule is the wrong instrument here.** A
required, non-optional field on `ModelType` and `QueryPrimitive` makes omission a type error, which
is stronger than a test. The `primitives` totality rule is a *test*
(`test/model-types.test.ts:156-167`) for a specific reason: the classification list and the form
vocabulary arrive from different places, and the compiler cannot relate a hand-written array of
`QueryPrimitive` to `GRAPH_FORMS`, so only a runtime set-comparison can hold them equal. No such gap
exists for `semanticBasis` — the field lives on the object it describes. And the two controls
*compose*: the compiler holds a basis per primitive, the existing totality rule holds a primitive
per form, so a new form cannot land unattributed without anyone writing a second totality test. A
form added to an engine vocabulary with no classification already fails `:156`; it would then fail
with no basis for the same reason.

**Rung 2 — non-placeholder content: a test, mirroring one the registry already has.** The registry's
`by-construction` gates owe a real reason, held by a length floor on the prose
(`test/model-types.test.ts:174-177`). The same assertion fits here: an `extension` arm's `why` must be
a sentence, a `borrowed` arm's `clause` must be non-empty, and a non-null `fixture` must name a
directory that exists. This is the control that stops the field decaying into `concept: "SysML"`,
which is the realistic failure mode — not omission, which rung 1 catches.

**Rung 3 — that the correspondence is *right*: nothing mechanical, and not reachable under the
no-dependency ruling. In §13's vocabulary, this is `asserted`.** A borrowed row claims the cited
KerML concept means what we say it means. That is a person reading a specification and a model
together on a date — K4 exactly (`SEMANTICS.md` §13.3), with the note bounding how far the reading
went. It becomes `checked` only under §13.1's earn-discipline: a named gate re-derives the claim on
every run and fails on drift in both directions. No gate can do that here, because we take no
runtime dependency and so nothing in CI can execute the Pilot Implementation. **The honest summary:
presence is enforceable and should be enforced; correspondence is `asserted`, and borrowed-semantics
provenance stays `asserted` until a conformance fixture exists.**

**What a fixture does change, precisely.** It splits the claim in two, and only one half moves.

- **MAGE's side becomes `checked`.** A fixture's Workbench model is an ordinary tracked
  `*.mage.yaml` with a pinned `expect`, and the coverage gate's denominator is *every* tracked
  `*.mage.yaml` (`test/model-coverage.test.ts:171`, driven at `:417`). So "MAGE still answers X about
  this fixture" is verdict-checked by landing the file — no new gate, which is most of why this shape
  is affordable. The pre-push hook's shape pass covers it on the same terms, since it validates every
  tracked `*.mage.yaml` against the schema (§13.2). It is a layer-2 warrant: K2 in §13.3, and the gate
  ships its own limit beside the number (`test/model-coverage.test.ts:118`, `:123`).
- **The correspondence stays `asserted`.** Nothing re-derives the standard's side per run. A
  transcribed oracle result is an assertion whose evidence a reader can reproduce by hand, which is
  stronger than a bare reading and still short of `checked`.

That last sentence presses directly on §13.6's **OQ3** — *is `checked` one kind or two?* A transcribed
oracle result is neither of OQ3's two senses: not gate-checked, not merely human-re-read. It is
recorded here as input to that question and **no fifth enum value is minted**, consistent with OQ2's
ruling that edits to the correspondence enum belong to the records' owners rather than to a prose
wave.

**Why review-alone is the floor rather than the answer, and why the theater precedent does not reach
this field.** `PLAN.md` §0.2a (`:133-148`) declined a provenance-string lint on `depends-on`
widenings as theater, in the author's words: *"You cannot mechanize 'Jamie has exercised engineering
judgment and approves this new architectural edge' by requiring a provenance string."* That argument
is sound and it reaches rung 3, which is why rung 3 claims nothing. It does not reach rungs 1 and 2. Requiring a
field is not theater when the field's absence would otherwise be silent, and from a registry entry
alone a deliberate non-attribution and a forgotten one look identical — the same reason the
`primitives` totality rule exists at all (`test/model-types.test.ts:157-159`). The division is the
one `PLAN.md` already draws: **the mechanism enforces conformance to the record, and makes no claim
about whether the record is wise.**

### 35.6 Conformance fixtures — the shape, not the corpus

The rule requires fixtures "demonstrating the intended correspondence." The method, in the author's
terms: *if KerML says binding X means something, we construct the smallest official SysML/KerML model
exhibiting X, evaluate it with the reference implementation where possible, and require the
corresponding Workbench fixture to have the same relevant interpretation.*

**This wave specifies the shape and builds no corpus.** One fixture, one directory, four files:

```
conformance/<standard>-<concept>-<nnn>/     # workbench-relative: the gates' pathspec reaches it
  source.sysml      the smallest official-syntax model exhibiting the construct,
                    drawn or minimized from the Release repository's examples / libraries
  claim.md          the specification sentence, quoted, with its clause citation;
                    and the ONE interpretation this fixture pins — not a summary of the concept
  model.mage.yaml   the Workbench model intended to correspond, with the pinned query and `expect`
  oracle.json       the warrant record (below)
```

**`oracle.json` is where "where possible" stops being a caveat and becomes data.** With no runtime
dependency, some correspondences get checked by executing the oracle and others by reading the
specification, and a corpus that does not distinguish them reports a uniform strength it does not
have. So the method is a required field, not prose:

```json
{
  "method": "executed",
  "oracle": { "implementation": "SysML v2 Pilot Implementation", "version": "<as run>" },
  "result": "<transcribed verdict>",
  "transcribed_by": "<person>", "transcribed_at": "2026-10-04"
}
```

```json
{
  "method": "specification-read",
  "clause": "<standard, clause>",
  "read_by": "<person>", "read_at": "2026-10-04",
  "bound": "what the reading does NOT establish"
}
```

Four consequences of that one field, which is why it earns its place:

- **A reader can sort the corpus by warrant** without opening any prose. "Eleven fixtures, four
  executed" is a sentence the directory can produce; "eleven conformance fixtures" is not a claim
  about strength.
- **`specification-read` owes a `bound`**, in the house form for an assertion (§13.3's K4): the
  warrant is a reading at a date, and the bound travels with it or the claim overstates.
- **`executed` records the oracle's version**, because a transcribed result is only reproducible
  against a named build. Without it the record cannot be re-run, which is the only thing that makes
  it stronger than a reading.
- **Neither method yields `checked`** for the correspondence (§35.5, rung 3). The field makes the
  ceiling visible instead of leaving a reader to infer that the executed rows are gated.

**What the fixture corpus does not attempt.** It demonstrates intended correspondence construct by
construct. It does not establish that the Workbench implements a SysML v2 subset, and no count of
passing fixtures should be read that way — the same discipline the coverage gate holds for itself by
shipping `NOT_PROVEN` beside its numbers (`test/model-coverage.test.ts:123`, held in place by
`:491`). A fixture for the binding subset says what one binding means in both places. It says
nothing about the next construct, and nothing about completeness.

### 35.7 SysML v2 subset import and export: a dated non-goal

**Recorded 261004. Not v0.2.** §32 already lists "importing arbitrary SysML models" and "exporting
valid SysML" among the non-goals; this records the *interesting* version of the idea so it reads as a
decision rather than an omission, in the register `PLAN.md` §0.2a uses for the quantities self-model.

A SysML v2 **subset** import/export — distinct from the arbitrary-model import §32 rules out — is
*"far more interesting than embedding their implementation."* It is the move that would make the
Workbench useful to someone who already has SysML models, and it needs no runtime dependency: a
subset reader and a subset writer over the textual or XMI syntax, bounded by exactly the eight
concepts of §3. It is still not v0.2.

**Trigger — revisit when both hold:**

1. **The conformance corpus covers every borrowed row of §35.4 with at least one fixture, and at
   least one of those fixtures is `method: "executed"`.** Import before that point is the unsafe
   order: reading a real SysML model through a correspondence nothing has demonstrated would
   silently reinterpret someone else's engineering, and the student would see a model that validates
   and means something else. The failure shape is §10.1's, one layer up.
2. **A named consumer asks.** A course exercise that starts from a supplied SysML model, or an
   external model the Workbench must read. Built before that, the subset boundary gets drawn by
   guesswork about which constructs matter.

**Review point: v0.3 planning**, whether or not either condition holds — an undated "later" rots
into a permanent omission, which is the lesson 261004 produced twice. If the answer at v0.3 is still
no, the answer gets re-recorded with its date and this entry is superseded rather than left to
imply that nobody looked.

---

## 36. Corrections to the verbatim text (editorial, 261004)

*§1–§34 are the author's text and are not edited. Where a sentence there contradicts shipped code,
the correction is recorded here with its evidence.*

### 36.1 §17 — `exhausted` is not a query result

**§17 lists five result values for a proposition: `holds`, `refuted`, then "plus potentially"
`inconclusive`, `unlicensed`, `exhausted`. The first four are the vocabulary. `exhausted` is not a
member of it.**

The evidence, read at `f3a9991c`:

- **`Outcome` is four-valued** — `holds | refuted | inconclusive | unlicensed`
  (`src/ir/types.ts:666`), with its own comment explaining why there is no boolean arm.
- **`exhausted` belongs to a different union, in a different layer.** It is the `kind` of
  `ExhaustedResult` (`src/sparql/eval.ts:70-71`), one arm of the SPARQL evaluator's `Evaluation` type
  (`:76`), and it is constructed at exactly one site (`:850`). Its meaning is the evaluator's step
  budget running out: *"Not empty, not refused: the question is licensed but too big for here"*
  (`src/sparql/eval.ts:69`).
- **That evaluator is the surface §29 demotes to diagnostic.** SPARQL over the RDF projection is an
  escape hatch and does not define Workbench semantics, so its result vocabulary is not the engine's
  result vocabulary. The slip is a word travelling from the demoted surface up into the normative
  one, which is the direction that silently widens a closed set.

**So it is a category slip and not a proposal for a fifth outcome, and the distinction decides
whether this specification contradicts a standing constraint.** `PLAN.md` §2 (`:415`) forbids
widening the set: "add a fourth outcome; return a bare boolean anywhere", reaffirmed at
`PLAN.md:422-424` in the same note that supersedes the liveness half — LTL verdicts use the existing
four-valued `Outcome`, and `exhausted` stays the SPARQL evaluator's word. Read §17 as a fifth-outcome
proposal and the specification conflicts with that constraint. Read it as a slip and it does not, and
the code supports the slip reading.

*An aside on that must-not's ordinal, since a careful reader will trip on it:* `PLAN.md` §9 (`:532`,
and §9's "No boolean results" bullet) lists the union's four values while §2 forbids "a fourth," so
the two disagree by one. `unlicensed` was present in `src/ir/types.ts` from that file's first commit
(`6cca06db`), so the ordinal is not a record of a three-valued past. The substance is the constraint
and the substance is unambiguous: **no outcome beyond the declared union.** The ordinal is left as
written rather than renumbered, since the cited sentence is quoted elsewhere.

**What §17 should be read as saying.** A proposition's result is `holds | refuted | inconclusive |
unlicensed`, and nothing else. "Preserve the existing verdict vocabulary" is §17's own instruction and
the four-valued union is that vocabulary. The engine's answer to a budget exhaustion already exists
and is not a new outcome: coverage travels with every result, bounded coverage reads `inconclusive`,
and rendering it as `refuted` is prohibited (V22; `SEMANTICS.md` §7.1, and `PLAN.md` §9, `:532`). So
nothing is lost by striking the fifth word — the question §17 reached for it to answer is answered by
`inconclusive` plus `coverage`, which is strictly more informative than a bare fifth verdict, since
it reports *why* the engine stopped.
