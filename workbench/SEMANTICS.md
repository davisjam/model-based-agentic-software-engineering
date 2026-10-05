# MAGE Model Workbench — semantic specification

**Status:** frozen kernel for v0.1. Everything in this document is implementable without an LLM, an
SMT solver, or a server. Anything not described here is not part of v0.1 semantics.

This is the authoritative semantics. The JSON Schemas beside it
([`mage-model.schema.json`](mage-model.schema.json), [`mage-query.schema.json`](mage-query.schema.json),
[`mage-transaction.schema.json`](mage-transaction.schema.json)) constrain *shape*; this document
fixes *meaning*. Where a question is about what a model asserts, this file decides it.

Validation rules are numbered **V1…V39** so implementations, tests, and error messages can cite them.
Numbers are append-only: a new rule takes the next free one and lands in the section that owns its
subject, so the sequence stays stable rather than sorted.

One finding id carries no number. `ANNOTATION` reports a malformed note (§5.1). Annotation sits
outside semantics by construction, so a V-number would file it under the one thing it is defined not
to be.

---

## 1. The governing principle: complexity is opt-in

> **A model has the simplest execution semantics consistent with what it explicitly represents.**

A single state machine does not introduce concurrency. Two machines introduce interleaving.
Synchronization exists only where an event is declared. Multiplicity exists only where instances are
declared. Binding between instances does not exist in v0.1 at all.

This is not only an implementation convenience. A tool that forces a modeler to represent
distinctions their question does not require is working against purposeful reduction. The semantic
tiers below are therefore *additive*, and each is visible on the page:

| Tier | Introduced by | Execution semantics |
|---|---|---|
| **T1** | one `machines:` entry | an ordinary finite transition system |
| **T2** | a second `machines:` entry | interleaved product; one machine steps per step |
| **T3** | an `events:` declaration + `sync:` on transitions | declared events step their participants jointly |
| **T4** | `instances: N` on a machine | N independent interleaved copies |

**Syntactic visibility (V1).** `sync:` means synchronization and nothing else; it MUST resolve to a
declared event in `events:`. Free-text documentation of a transition goes in `label:`. Therefore
"does this model contain joint steps?" is answerable by looking for `sync:`.

The key is `sync:` and **not** `on:` for a concrete reason: YAML 1.1 implicit-types a bare `on` key to
boolean `true`, so `on: acquire` loads as `{True: 'acquire'}` and the synchronization silently
disappears. See §10.1.

---

## 2. Identity

There is exactly **one identity namespace**: `entities`.

```yaml
entities:
  remediation:
    type: service
    label: Remediation Service
```

- **Ids are immutable (V2).** No operation changes an id. `set-label` changes the human-readable
  `label`; references always use the id. An id's absence from the system after a transaction is a
  deletion, never a rename.
- **Models reference entities; they never redeclare them (V3).** A `graph` model lists ids under
  `entities:`; every id MUST resolve to a system-level entity.
- Containment is declared on the entity (`contains: [...]`) and yields hierarchical paths
  (`docable/remediation/parser`). Containment MUST be acyclic (V4) and single-parent (V5).

**Machines are not entities.** A state machine has *behavioral* identity; it need not model a
component of a structural model. Where the correspondence does exist, declare it:

```yaml
machines:
  remediation-lifecycle:
    entity: remediation      # optional
```

`entity:` MUST resolve to a declared entity (V6). Selecting that entity then highlights its machine,
and vice versa. Absent `entity:`, a machine is simply an automaton the system contains — which is the
honest description of most behavioral models.

---

## 3. Graphs: entities and typed relations

```yaml
relation-types:
  data_flow:
    description: Data may flow directly from source to target.
    absence: No direct data flow is represented by this model.
    composition:
      path: allowed
    properties:
      symmetric: false
      acyclic: false

models:
  service-flow:
    type: graph
    entities: [api, remediation, gateway]
    relations:
      - id: api-remediation
        from: api
        to: remediation
        type: may_invoke
```

The workbench assigns **no** universal meaning to a relation type. `description` and `absence` are
for humans. The only machine-readable semantics are these:

### 3.1 Path composition is declared, not assumed

`composition.path` is `allowed` or `forbidden`. It governs whether a **multi-hop** query over that
relation type is licensed.

This is deliberately *not* a claim that the relation is transitive. `calls` is not transitive — if A
calls B and B calls C, A does not call C — yet "can A reach C through calls?" is a perfectly
meaningful derived question. `composition.path: allowed` says the transitive closure is a licensed
object of inquiry; it does not add edges to the model.

**V7.** A query over a relation type with `composition.path: forbidden` MUST be refused, not
answered, when its answer is **derived by composing edges**. The composing forms are exactly
`path`, `reachability`, `shortest-path`, `all-paths` and `components`, and that list is exhaustive:

> `owns` is declared as a direct relation without path-composition semantics. A multi-hop `owns`
> query is not licensed by this model.

Every other form is licensed regardless of `composition.path`, and the reason is the same each time
— it asks what the model literally says rather than what follows from it:

| form | why `forbidden` does not reach it |
|------|-----------------------------------|
| `direct` | one declared edge |
| `predecessors`, `successors` | the adjacency read ONE STEP, in one direction |
| `cycles` | licensed by V8's `properties.acyclic`, which a forbidden type may also declare |
| `containment` | walks the entity `contains` tree (§2), not a relation type |

`components` is in the gated list although it names no path: a connected component is a
reachability class, which is exactly the inference `forbidden` declines to authorize.

The enumeration is written out because it was read as open. V7 once listed three forms and said no
more, and the two implementations drew different boundaries around the fourth: `validate.py`
refused `predecessors` while the engine answered it, on message-bus and document-processing, with
nothing failing. The question "is this form gated?" now has one answer per form and a test that
holds both tools to it (`test/parity.test.ts`).

Refusal is a successful query outcome (`outcome: unlicensed`), not an error. Being told that a
question is not answerable from a model is information.

**V8.** `properties.acyclic: true` makes a cycle in that relation type a validation error.
`properties.symmetric: true` means the engine treats each edge as bidirectional for traversal; it
does not require a reverse edge to be declared.

---

## 4. State machines

```yaml
machines:
  document:
    initial: uploaded
    states:
      uploaded:
      processing:
      reviewed:
      published:
      failed:
    transitions:
      - from: uploaded
        to: processing
        label: start
      - from: processing
        to: failed
        label: fail
```

- `initial` MUST name a declared state (V9); `from`/`to` MUST name declared states (V10).
- **Nondeterminism is allowed and required.** Several transitions may leave the same state under the
  same conditions; they are alternatives, and exhaustive analysis explores all of them. This is what
  makes "may fail" expressible.
- A machine with no `sync:` and no guards is a plain transition system (T1).

### 4.1 Guards

```yaml
    transitions:
      - from: processing
        to: reviewed
        requires:
          worker.state: held
          retry_count: { lt: 3 }
```

- A guard is **evaluated against the pre-transition system state**, atomically with the transition it
  gates.
- **A guard is not synchronization.** It *reads* another machine's state without causing that machine
  to step. This distinction is load-bearing and routinely conflated: `sync:` makes two machines move
  together; `requires:` lets one machine look at another and move alone.
- Consequently, an interval during which another machine may intervene **cannot** be expressed by a
  guard. If you need to represent check-then-act exposure, represent the interval as states and
  transitions. That is a modeling obligation, not a tool limitation.
- **V11.** A guard referencing a machine with `instances: N > 1` MUST be refused, for the same reason
  as V14 — there is no participant selection in v0.1.
- **V26.** A guard's `value` MUST be a member of the domain of the variable or state set its `ref`
  resolves to. A `ref` resolving to a control state compares against that machine's declared states;
  a `ref` resolving to a variable compares against that variable's enumerated domain. A bounded
  integer declares a `range` rather than a list, so there the test is an interval.

  A guard comparing against a value the reference can never hold is dead. The transition never
  fires, the reachable set is smaller than the author believes, and every query over it answers a
  question about a different system — soundly, which is what makes it hard to notice.

  V26 reports membership and nothing else. A `ref` that resolves to no declared machine member, and
  an order comparison on a reference with no declared ordering, are separate failures: the engine
  refuses both when it compiles the guard, and blaming domain membership for a reference error would
  send the author to the wrong line.

### 4.2 T2 — interleaving

Two or more machines form an interleaved product. The configuration is the tuple of machine states
plus all variable valuations. **One enabled transition of one machine executes per step.** No
scheduler, no fairness, no priority.

That alone answers the first genuinely interesting class of question — *can `document=processing` and
`worker=idle` hold simultaneously?* — with no synchronization machinery at all.

### 4.3 T3 — declared synchronized events

```yaml
events:
  acquire:
    participants: [document, worker]

machines:
  document:
    transitions:
      - from: waiting
        to: processing
        sync: acquire
  worker:
    transitions:
      - from: idle
        to: held
        sync: acquire
```

A declared event is **one system transition involving all its participants**. Semantics:

1. The event is enabled iff **every** participant has an enabled `sync:`-transition for it in the
   current configuration (guards evaluated against the pre-state).
2. All participants' effects apply **atomically**; the intermediate state is not observable and
   cannot be queried.
3. **V12.** Every machine named in `participants` MUST declare at least one transition `sync:` that
   event, and every transition's `sync:` MUST name an event listing that machine as a participant.
   A participant that never participates is a modeling error, not a silent no-op.
4. **V13.** Two transitions joined by one event MUST NOT assign the same variable. Conflicting
   writes in a single atomic step are a validation error, detected statically from declared effects —
   not resolved by an arbitrary winner at runtime.

### 4.4 T4 — multiplicity, and what it deliberately does not give you

```yaml
machines:
  worker:
    instances: 3
```

`instances: N` yields N **independent** copies, `worker[0] … worker[2]`, whose transitions interleave.
Default is 1, and a machine with one instance is addressed by its bare name.

**V14 — participant selection is unsupported.** An event whose `participants` include a
multiply-instantiated machine MUST be refused at validation:

> `acquire` synchronizes with multiply-instantiated machine `worker`. Participant selection is not
> supported by this version. Model the participants explicitly, or use a single `worker` instance.

This is the honest boundary. Multiplicity gives **occupancy**, not **binding**:

- Answerable: *can two workers be `held` at the same time?* — a predicate over the product, with a
  witness trace.
- **Not** answerable: *can two workers hold the same document?* — "the same document" is a relation
  between instances, and v0.1 has no instance-valued state.

**Modeling around it.** Where binding genuinely matters, model the resource rather than the holders:
a single lock machine with states `free | held_by_0 | held_by_1` is finite, exhaustively analyzable,
and says exactly what it means. Prefer that to reaching for `instances:`.

**Reserved, not implemented.** This shape is legal to write and MUST be rejected by v0.1 with a
"reserved for a future version" message rather than misinterpreted (V15):

```yaml
variables:
  holding:
    type: ref
    target: document
    nullable: true
```

**Symmetry.** N independent copies of one machine type make configurations that differ only by
permuting identical instances equivalent. v0.1 need not exploit this; it is the obvious first
optimization if the state limit becomes a practical ceiling.

---

## 5. State: three categories with a hard boundary

```yaml
properties:               # immutable descriptive facts — NOT state
  region: us-east
variables:                # mutable — contributes to the state vector
  retry_count:
    type: integer
    range: [0, 3]
derived:                  # pure expressions over current state — NOT state
  exhausted: retry_count == 3
```

- **`properties` are immutable (V16).** No transition may assign one. They describe; they do not vary.
  They participate in graph and cross-model queries, never in the state vector.
- **`variables` are the state vector.** Every variable MUST have a **finite domain** in v0.1 (V17):
  bounded integer `range`, Boolean, or enum. No unbounded integers, no reals. This is what makes
  exhaustive exploration meaningful rather than aspirational.
- **`derived` values are never stored and never part of state identity (V18).** They are recomputed
  from the current configuration. Storing them would both inflate the product and allow two
  configurations with identical variables to compare unequal. The derived dependency graph MUST be
  acyclic (V19).

Domains are declarable and may be ordered:

```yaml
domains:
  sensitivity:
    type: ordered-enum
    values: [public, internal, restricted]
```

**V20.** Comparison operators (`<`, `>`, `<=`, `>=`) between two properties are well-typed only if
both declare the **same** domain and that domain is ordered. This is what makes the cross-model
security join legal:

```yaml
entities:
  remediation: { properties: { classification: restricted } }   # domain: sensitivity
  gateway:     { properties: { accepts: public } }              # domain: sensitivity
```

`classification > accepts` now typechecks. Partial orders and lattices are deliberately out of scope
until incomparable elements are actually needed.

### 5.1 Annotation is carried, not interpreted

An entity, a model and a relation may each carry `notes:` and `provenance:`. Those are the three
levels the loader reads annotation from, and they obey one invariant:

> **A1.** Annotations SHALL NOT alter the semantic interpretation or analysis result of a model
> unless their content is explicitly represented by a semantic construct.

A1 is held structurally rather than by discipline: the canonical hash projects semantics only, and
annotation is not in the projection. Two systems differing only in notes are therefore the same
system, which is why adding a note commits without advancing the semantic revision and cannot
invalidate a pending agent transaction. The boundary matters most for `kind: assumption`. A note
*saying* something is an assumption does not make that assumption part of formal analysis; to
constrain a query it must be represented as a property, a variable, a guard or a quantity. Context
can be abundant; formal commitment is deliberate.

Being non-semantic does not make a note unchecked. A malformed one is reported under the finding id
**`ANNOTATION`**, which carries no V-number on purpose: the V-rules fix meaning, and filing an
annotation finding among them would contradict the invariant the feature rests on.

What `ANNOTATION` reports is the truncation trap. YAML flow style terminates an unquoted value at a
comma, so

```yaml
notes:
  - { kind: comment, text: one thing, and another }
```

loads as `text: "one thing"` plus a stray KEY `and another`. The note is half gone and nothing looks
wrong, which is worse than a note that failed to load. The finding names the stray key, because the
fix is to quote the value and the author needs to know which text got cut. The schema deliberately
leaves a note object open so this reaches the meaning pass: a shape complaint about an unexpected
property is the same unhelpful message V25 exists to replace.

### 5.2 Quantities annotate the model; they are not part of it

> Quantitative annotations SHALL NOT enter the behavioral state vector merely because their values
> are real-valued. — ruling §6

A quantity is evaluated **over** a configuration, a transition, a path or the model's structure. It
is never a coordinate of a configuration. So

```yaml
accounting:
  latency: { basis: entities }

quantities:
  parse-latency:   { target: entity:parser, dimension: duration, value: 20 ms }
  gateway-latency: { target: entity:gateway, dimension: duration, range: [100 ms, 500 ms] }
  cache-memory:    { target: entity:cache,  dimension: memory,   value: 128 MB, residency: resident }
  hit-rate:        { target: entity:cache,  dimension: ratio,    value: 0.80 }
```

leaves the reachable configuration space exactly the size it was.

⚠️ This illustration changed with the accounting ruling (§5.3) and the change is worth noticing,
because it is the clearest demonstration of what the ruling costs. The pre-ruling version annotated
latency on `transition:document#0` and on `relation:remediation-gateway`; under `basis: entities`
both are findings (V36), and a `memory` quantity with no `residency` is a finding too (V37). The
earlier spelling is not merely discouraged now — it does not validate. This is the hard boundary of the
feature, and it is the one place where a convenience shortcut would be unrecoverable: a real-valued
annotation in the state vector makes the space infinite while the walk keeps reporting
`Coverage.kind: "exhaustive"`, and that flag licenses the strongest claims the workbench makes.
`test/quantities.test.ts` counts configurations with and without the annotations above.

**Put this beside §5.1 and the boundary reads clearly in both directions.** A note saying *"gateway
latency is probably 200 ms"* cannot change a latency query, because invariant A1 keeps annotation out
of the semantic projection. A declared quantity of `200 ms` must, so it enters the hash. Context can
be abundant; formal commitment is deliberate.

#### Dimensions and normalization

Five dimensions, closed:

| Dimension | Base | Units | Scope |
|---|---|---|---|
| `duration` | `ms` | `ms: 1`, `s: 1000` | execution |
| `memory` | `MB` | `KB: 0.0009765625`, `MB: 1`, `GB: 1024` | configuration |
| `cost` | `usd` | `usd: 1` | execution |
| `ratio` | — | none; a bare number in `[0, 1]` | structural |
| `count` | — | none; a bare number | structural |

**Literals normalize to the base unit during canonicalization.** A quantity reaches anything
downstream in base units or not at all. Every factor above is an integer multiple of a power of two,
so the conversion introduces no rounding and `128 KB + 1 MB` is 1.125 on the nose — which is why a
normalized magnitude is a plain float rather than a rational. A unit whose factor is not a binary
fraction (microseconds at `0.001`, say) fails the gate in `test/quantities.test.ts` rather than
quietly degrading every later equality.

**Scope follows the dimension, and is never authored.** The ruling (§8) puts memory over
configurations and latency and cost over executions, so aggregation is DERIVED from the dimension
rather than chosen per query. Asking for the sum of a configuration-scoped quantity along a path is
then a category error the types refuse, not a wrong answer something computes. ⚠️ The ruling names
two scopes; the IR carries a third, `structural`, for `ratio` and `count`. A hit rate aggregates
along neither axis — filing it under `execution` would license *summing hit rates along a path*,
which is exactly the error a typed scope exists to refuse.

Scope now decides more than aggregation: it selects which accounting declaration a quantity owes
(§5.3). An execution-scoped dimension is accounted by a declared **basis**; a configuration-scoped
one by a declared **residency**. That is why the metric set and the residency requirement are both
read off this table rather than listed by hand — a dimension that changes scope changes what its
annotations must declare, and deriving it means the rules change with it.

#### Addressing

Every quantity targets `<kind>:<ref>` over a closed kind set: `transition:`, `relation:`, `entity:`,
`state:`, `parameter:`, `model:`.

- A **relation** is addressed by its own `id:`. Endpoints are not a stable id — a second edge between
  the same pair would silently make the annotation ambiguous.
- A **transition** is addressed `transition:<machine>#<index>`. ⚠️ The ruling illustrates
  `transition:parse`, which this version does not accept: transitions carry no id, `label:` carries
  no semantics (V1), and two transitions may share a label. The index is already how a transaction
  deletes a transition, so it is the handle that exists.
- A **state** may be bare when exactly one machine declares it, and must be qualified
  `state:<machine>.<state>` otherwise. The resolver refuses the ambiguity rather than picking a
  machine, matching how a bare variable reference resolves in §4.1.
- `parameter:` is **reserved**. v0.1 represents no parameters, so the finding says so rather than
  reporting a missing declaration the author cannot write — the treatment V15 gives `ref` variables.
- `model:` addresses the whole model rather than anything inside it, which makes it the one kind no
  accounting rule charges (§5.3). A `model:` quantity is a declared total to compare against.

#### Model metrics live in a reserved namespace

```yaml
value: { expression: metrics.state_count * 2 ms }
```

`metrics.state_count`, `metrics.transition_count`, `metrics.entity_count` and
`metrics.relation_count` are facts computed **from** the model, not asserted **about** the modeled
system (ruling §10). They count declared structure: `state_count` sums each machine's states and is
not the number of reachable configurations, because a model metric that depended on exploration would
stop being a fact about the model. They are never ambient — `metrics` is reserved, and a user
identifier of that name is a finding.

#### Expressions

A `value: { expression: … }` is a sum of products over literals, `metrics.*` values and other
quantity ids. Operators stand alone between spaces, because an id may contain `-` and splitting on
the character would cut `gateway-latency` in half. There are no parentheses in v0.1.

Expressions are **dimensionally typed, never evaluated**. `ratio` and `count` collapse to
dimensionless under arithmetic — a proportion and a tally are both pure numbers — which is what makes
`metrics.state_count * 2 ms` a duration without making `ms * ms` legal.

#### The rules

- **V27 — every reference a quantity makes resolves.** A quantity whose `target` does not exist is an
  error, and so is an expression naming an undeclared quantity, a `metrics.*` value that is not one
  of the four, or a `when.state` naming a state no machine declares (§5.3). No dangling annotations
  (ruling §9). The failure is V26's one layer up: an annotation pointing at a deleted transition is
  not invalid, it is *wrong*, and nothing reports it unless a rule does. The `target: state:…` and
  `when: { state: … }` references go through ONE resolver, so the bare-name ambiguity refusal cannot
  be fixed in one and forgotten in the other.
- **V28 — the dimension and every literal are readable.** The dimension MUST be one of the five. A
  literal MUST carry a unit of that dimension where the dimension has units, MUST NOT where it does
  not, and MUST be written as a plain decimal. The spelling restriction is not fussiness: measured,
  PyYAML reads `017` as 15, `1_000` as 1000 and `1:30` as 90, while the `yaml` package reads 17,
  `"1_000"` and `"1:30"`. A unit-bearing literal is a YAML *string*, so refusing those spellings
  closes the class for `duration`, `memory` and `cost` outright. A bare number where a unit is
  required is the sharpest case of all — a silently assumed unit is the dimension bug this feature
  exists to prevent, committed by the feature itself.
- **V29 — the magnitude is admissible.** No dimension admits a negative magnitude (ruling §29 ⑥
  grants safety to *monotone nonnegative* interval expressions). A `ratio` lies in `[0, 1]`: a hit
  rate of `1.3` is a finding, because the constraint is a rule and not a sentence in a table. A
  `range` runs low to high.
- **V30 — dimensions agree.** Within a literal, between a literal's unit and its declared dimension,
  across both ends of a range, and among the operands of an operation. `250 ms + 2 s` is valid,
  `128 MB + 1 GB` is valid, `250 ms + 128 MB` is not. Ruling §7: *do not silently coerce dimensions.*
  A dimension error is exactly the defect that yields a plausible number nobody questions.
- **V31 — `metrics` is reserved.** No entity, model, machine, state, variable, derived value, event,
  relation type, domain or quantity may be named `metrics`. A shadow would make `metrics.state_count`
  read as that object's member, and the §10 distinction would stop being visible on the page.
- **V35, V36, V37 — the declared accounting model.** §5.3, below. They are the rules that make a
  validated-but-unreachable quantity impossible.
- **V38 — `executes_in_state` resolves.** §5.3, below. The join those three charge *through*, held to
  the same reference discipline as the references they check.
- **V39 — a quantity query's ceiling resolves.** §5.3, below. The one reference a saved *query* makes
  into the quantities map — `quantity.within`, naming the `model:`-targeted total it decides against
  — held to the same no-dangling-references discipline as V27.

Each rule declines once an earlier one has spoken about the same object, which is V26's discipline
applied inside this family. A quantity with an unreadable dimension draws no magnitude complaints —
every one of them would be a consequence. An expression with an unresolvable operand draws no
dimension complaint, because a guessed dimension mismatch sends the author hunting for the wrong
defect. A quantity whose `target` does not resolve draws no accounting complaint either, because
which accounting a quantity needs depends on what it annotates.

### 5.3 The accounting model is declared, and MAGE refuses to guess

> A quantitative annotation that cannot participate unambiguously in the accounting semantics of its
> metric is **invalid**, rather than silently inert. — ruling, 2026-10-02

This is the governing principle of the whole quantity layer, and it is stronger than tidiness. If
MAGE accepts a quantity as meaningful there must be a defined route from that quantity to the
analyses its dimension is intended for; otherwise the type system is claiming more than the semantics
provide. A quantity that typechecks, validates, and then reaches nothing is the worst available
outcome, because nothing looks wrong. V35, V36 and V37 exist to make that state unreachable, and V38
holds the join they charge through.

Two declarations do the work, and both are **authored** rather than inferred.

#### Path aggregation declares a basis (V35, V36)

```yaml
accounting:
  latency:
    basis: entities
```

**V35 — each path-aggregated metric with annotations declares one accounting basis.** A *metric* is
not a dimension: `latency` names the analysis, `duration` names the unit algebra. The path-aggregated
metrics are exactly those whose dimension is execution-scoped — `latency` (duration) and `cost` — and
that membership is derived from the dimension table rather than listed by hand. The basis vocabulary
is `entities`, a **closed set of one**: transition and relation accounting can be added deliberately
later, and a permissive union cannot be narrowed again without breaking every model that relied on
it. The ruling rejected an `all` basis for exactly that reason — with it, *"double counting then
becomes an authoring problem with no principled answer."* The requirement is triggered by the
presence of a quantity the basis would charge; a system with no duration annotation has nothing that
could over-claim, so a mandatory declaration about nothing would be noise rather than a control.

**V36 — a quantity contributes to its metric only through the declared basis.** An execution's
latency is the sum of the latency assigned to each **occurrence** of an accounted entity along the
execution. Latency annotations on other semantic kinds SHALL NOT implicitly contribute, and are
rejected when associated with that metric — so under `basis: entities`, a `duration` on a
`transition:`, `relation:` or `state:` target is a finding.

Why this is not merely arithmetic hygiene: indiscriminate summing *"makes the meaning of a model
depend on whether the author happened to represent the same operation in multiple linked models.
Shared identity should let us connect purposeful models, not cause their annotations to be
accumulated."* A retry is charged twice because **the behavioral trace visits that operation again**,
never because a state duration and a transition duration were added together. The join is:

```
behavioral execution --shared identity--> performance component --> duration
```

The lifecycle model decides which stages execute and how often; the performance model decides what
each execution costs.

##### The join is authored, so it is a reference, so it resolves (V38)

The arrow in the middle of that diagram is a declaration. An entity's **`executes_in_state`** property
names the lifecycle state during whose occupancy the entity runs, and a trace step entering that state
is an occurrence of the entity. Absent the property, a state spelling the entity's own id *is* the
entity, which is MAGE's composition doctrine applied to accounting.

```yaml
entities:
  remediation:
    properties:
      executes_in_state: remediating      # or document.remediating
```

**V38 — an entity's `executes_in_state` resolves to a declared state.** The reference is qualified
`<machine>.<state>`, or a bare state name exactly one machine declares; a bare name two machines
declare is ambiguous and is refused with "qualify it" rather than resolved by picking one. A value
that is not a state reference at all — a number, an empty string — names no state and is the same
finding.

Resolution goes through the **same resolver** as a quantity's `state:` target and its `when.state`
(V27). Three reference rules, one resolver: a third copy is how the bare-name ambiguity refusal gets
fixed in two of them and forgotten in the third.

Its own number rather than V27's, and the distinction is the author's. V27's subject is a *quantity's*
references, and its remedy is to edit an annotation. This reference is made by an *entity*, and
someone whose `executes_in_state` is wrong is not editing a quantity at all. The two findings cite
different lines and send a reader to different places, which is what a rule id is for.

Why it earns a rule rather than staying a test: this property decides which entity every trace step
charges, and therefore every latency number the workbench reports. It was checked only by one shipped
example's own suite — so a property naming no state in any *other* model got no finding and then
quietly charged nothing, which is the governing principle's failure one level above V35–V37.

⚠️ V38 is the **forward** half. The backward half — an entity that a basis charges but that has no
counterpart on either route — is not a rule, because whether a counterpart is wanted depends on which
quantities the declared basis charges rather than on the declaration alone. The evaluator refuses it
when it builds a charge table, naming the missing correspondence.

**A declaration REPLACES the identity route for its entity**, rather than adding to it: two live
routes for one entity would be the double-counting shape the accounting rulings exist to refuse. That
precedence is **semantics, not a rule**, and the distinction is worth stating because it looks like
V37's "declares both" finding and is not one. V37 can fire because `residency` and `when` are the two
summands of `memory(c)` and a quantity that declares neither enters no summand — there is a model an
author can write that the rule refuses. Here the precedence is total: a declaration either exists or
it does not, the outcome is defined either way, and no model violates it. A rule with no possible
finding is not a rule; it is the semantics, and it belongs here.

The near-miss, recorded because it is the thing that would change the answer: an entity whose id
*spells* a state while also declaring `executes_in_state` for a *different* one has authored two
contradictory joins, and the precedence drops one of them silently. That would deserve a finding —
the shape is V37's "declares both" exactly. It is not one today because every model in this repo has
an empty intersection between entity ids and state names, so the predicate has no subject and the
identity route is unexercised. The trigger to promote it is the first model that writes both.

⚠️ `model:` is **exempt**, and that is a judgement this version makes explicitly rather than by
omission. A `model:` quantity is a declared TOTAL — *path latency is `metrics.state_count * 2 ms`* —
which a requirement is compared against, never accumulated per occurrence. No basis charges it, so
nothing sums it implicitly and the governing principle is satisfied: the route from a model-level
total to an analysis is comparison, not aggregation. Without the exemption there would be no way to
state a model-level total at all.

#### Configuration-scoped quantities declare when they are charged (V37)

```yaml
quantities:
  # charged exactly while that behavioral state is active
  remediation-memory:
    target: entity:remediation
    dimension: memory
    value: 256 MB
    when: { state: document.remediating }

  # charged in every configuration where the entity exists
  cache-memory:
    target: entity:gateway-cache
    dimension: memory
    value: 128 MB
    residency: resident
```

⚠️ The ruling illustrates these as a list of `{ target: remediation, quantity: memory }` entries. The
addressing above is this version's, unchanged: `quantities` is a map, `target` carries its kind
prefix (§5.2), and the field is `dimension`. The two declarations are the ruling's; only the
surrounding syntax is ours.

Together they give a mechanical predicate:

```
memory(c) = Σ  memory(e)  for e ∈ Resident
          + Σ  memory(e)  for e where active(e, c)
```

**`active(e, c)` is never guessed.** The annotation identifies the behavioral thing whose activation
licenses the charge, through shared identity or an explicit `when`.

**V37 — a configuration-scoped quantity declares exactly one of `residency:` or `when:`.** Neither is
a finding: such a quantity enters neither summand, so no configuration charges it. Both is a finding
too, because a quantity enters one summand and accepting both would either double-charge or silently
pick a winner. `residency` is closed at `resident`; `when.state` resolves like every other reference
(V27). Declaring either on a quantity that is not configuration-scoped is a finding — residency says
which *configurations* charge a quantity, which only a configuration-scoped dimension asks — and so
is declaring either on a `model:` target, for the same reason `model:` is exempt above: `memory(c)`
sums over entities, and a whole-model figure is compared against it rather than being a summand.

The ruling's reason for refusing to infer is the part that generalizes:

> I would not say "idle service memory stays resident" or "idle service memory disappears." Neither
> is something MAGE can infer from "service." That's exactly the sort of apparently reasonable
> implicit semantics that will bite us later.

Both candidate defaults were implicit semantics dressed as a default. Making residency authored
removes the question instead of answering it badly.

**The declarations are semantic, so they enter the hash.** They decide which analyses a quantity can
participate in, so two systems differing in them are not the same system — the contrast with
annotation, which invariant A1 excludes from the hash entirely, is the sharpest statement of where
the formal boundary lies. A note saying *"this cache is always resident"* cannot change a memory
analysis; `residency: resident` must.

#### The quantity query form — asking for what the evaluator computes

Quantities and their accounting are represented, validated (V27–V38), **evaluated** (`src/quant/`),
and — the last seam — **askable**: a query of `kind: quantity` reaches the evaluator through the
same engine facade every other question uses.

```yaml
max-publishing-latency:
  kind: quantity
  quantifier: forall
  quantity:
    metric: latency                  # latency | cost | peak_memory — the ANALYSIS vocabulary
    within: latency-requirement      # the declared model:-targeted ceiling to decide against
```

Two shapes, told apart by `within`. With it, the query DECIDES the declared ceiling — a universal
claim (`quantifier: forall`), answered in the existing Outcome/Coverage/Evidence vocabulary under
the V22 discipline: a violating execution or configuration refutes on its own evidence, `holds`
needs the whole space, a truncated unviolated walk reads `inconclusive`. Without it, the query
MEASURES — the worst case over the selected executions, or the peak of `memory(c)` — established by
the witness that attains it (`quantifier: exists`). Either way the computed figure travels on
`result.magnitude` as `{ value, dimension, unit }`: the dimension rides WITH the number for the
reason the RDF projection keeps it, because a bare number lets a consumer add milliseconds to
megabytes, which V30 forbids at the validation layer.

**There is no aggregation parameter, and that absence is the design.** The aggregation is DERIVED
from the metric's dimension scope (§8): `latency` and `cost` are worst-case sums along executions,
`peak_memory` is the maximum of `memory(c)` over the reachable set. What a caller may select is
*which executions* (`target:`, a reach predicate the selected executions end at) — paths and traces
stay distinguished from analyses over them, which is §29 refinement ①, and the `max|min|named`
selector it rejected cannot reappear as a query field. Asking for a configuration-scoped quantity
along executions (`peak_memory` with a `target:`) is a **category error, refused by name** — never
a wrong answer something computes.

**V39 — a quantity query's `within` resolves to a declared quantity.** The dangling-reference
discipline of V27, applied to the one reference a query makes into the quantities map. Both
implementations enforce it; the engine additionally refuses, at ask time, a ceiling that is not
`model:`-targeted (a summand is not a bound) or whose dimension differs from the metric's (V30's
class, at the query surface). A ceiling declared as a `range:` or an expression refuses under Q1's
worst-case-only rule — interval arithmetic stays deferred to SMT.

---

## 6. Execution semantics, precisely

A **configuration** is `(control, values)` where `control` maps each machine instance to one of its
states and `values` maps each variable to a value in its finite domain. The initial configuration
takes each machine's `initial` and each variable's declared initial value.

A **step** from configuration *c* is one of:

- a **local** transition: some instance has a transition with no `sync:`, whose guards hold in *c*;
  that instance moves and its effects apply.
- an **event** step: some declared event has every participant offering an enabled `sync:`-transition
  in *c*; all participants move and all effects apply atomically.

The **reachable set** is the least set containing the initial configuration and closed under steps.
There is no fairness, no priority, and no notion of time. A configuration with no enabled step is a
**dead end** and is reported as such, not treated as an error.

---

## 7. Queries

Every query carries an explicit **quantifier**. This is not a stylistic choice: it determines what
counts as evidence, and conflating the two is the single most common modeling error the workbench
exists to make visible.

| Claim | `holds` is established by | `refuted` is established by |
|---|---|---|
| **∃** a trace satisfying *P* | a **witness** trace | **exhaustive absence** |
| **∀** reachable configurations satisfy *P* | **exhaustive satisfaction** | a **counterexample** |

Under bounded coverage neither column is available and the outcome is `inconclusive` (V22).

**V21.** A natural-language question that does not determine its quantifier MUST either request
clarification or display the interpretation it chose:

> I interpreted this as: *does there exist an execution in which `S` occurs before `T`?*

### 7.1 Coverage is part of every result

```yaml
outcome: refuted
coverage:
  kind: exhaustive
  states_explored: 37
```

```yaml
outcome: inconclusive
coverage:
  kind: bounded
  states_explored: 1000000
  reason: state-limit
```

**The outcome vocabulary is `holds | refuted | inconclusive | unlicensed` — deliberately not
`true`/`false`.** Two reasons, and both matter. Semantically, there is no boolean result: there is a
claim, its coverage, and its evidence, and naming the status `true` invites exactly the
`result: boolean` shortcut the result type exists to prevent. Mechanically, a bare `true` or `false`
in YAML is implicit-typed to a boolean (§10.1), so `expect: false` in a saved query arrives as a
Python/JS boolean and silently matches nothing. That bug was found by this spec's own gate, which is
the argument for V25 in miniature.

**V22 — incomplete coverage weakens conclusions drawn from ABSENCE, never evidence already found.**

> Incomplete coverage prevents conclusions that depend on the absence of settling evidence. It does
> not weaken settling evidence that has been found.

**Settling evidence** is a **witness** for an existential claim or a **counterexample** for a
universal one. Either establishes its claim on its own terms, because further search cannot unfind
it. So:

| | settling evidence found | none found |
|---|---|---|
| **∃** | `holds` — regardless of coverage | `refuted` iff exhaustive, else `inconclusive` |
| **∀** | `refuted` — regardless of coverage | `holds` iff exhaustive, else `inconclusive` |

Only the right-hand column depends on coverage, and that is the whole of V22. "No such trace exists"
is sound only under exhaustive coverage; under a bound the true statement is "no such trace within
the explored region", which is `inconclusive` and MUST NOT be rendered as "no".

The principle is stated generally rather than as a rule about bounded search, because it travels:
any future incompleteness — a time limit, a depth limit, a sampling strategy, an abstraction — has
the same shape.

The state limit is a **v0.1** concern, not a later one. Finite domains do not bound the product
*usefully*: two machines, three instances and one `[0,10]` variable already reach millions of
configurations.

### 7.2 Evidence shapes

- **trace** — a finite sequence of steps from the initial configuration.
- **lasso** — a finite prefix plus a repeating segment. Implementations MUST support both shapes from
  the start rather than retrofitting the second.

### 7.2a Two cycle questions, two forms — a query denotes a question, not a search strategy

`recurrence` and `repeatable-cycle` both produce a lasso, and they are deliberately distinct:

| Form | Asks | Holds when |
|---|---|---|
| `recurrence` | *Can the system return to S?* | the target is **re-entered**: a target configuration, ≥1 step, another target configuration |
| `repeatable-cycle` | *Can it loop indefinitely from S?* | a **configuration genuinely repeats**, which is what makes a cycle repeatable |

The worked example shows why one form cannot serve both. `document-can-return-to-waiting` asks about
a retry loop that advances `retry_count`, so `(waiting, 0)` … `(waiting, 3)` are four *distinct*
configurations and none ever repeats. The honest answers are therefore **`recurrence`: holds** (it
demonstrably returns) and **`repeatable-cycle`: refuted** (it cannot run forever).

An earlier design made `recurrence` search for a true cycle first and fall back to re-entry, saying
which it had done. That is **forbidden**: it lets one query mean two different things depending on
what the search happened to find, so a reader cannot tell from the query what was asked. Each form
has exactly one denotation, and `recurrence` discloses nothing because it substitutes nothing.

This is the same distinction the quantitative rules draw: a strictly-advancing loop is not a
repeatable cycle, which is why it cannot make an additive maximum unbounded.

### 7.3 Past-time properties compile to safety

"Can `published` occur without `reviewed` having occurred?" is a past-time property. v0.1 does **not**
implement past-time operators. Such a query is compiled into a safety property over an auxiliary
**history variable**: a Boolean `seen_reviewed`, set on entry to `reviewed`, with the invariant
`published → seen_reviewed`.

**V23.** The compilation MUST be disclosed in the result:

> I added a history variable `seen_reviewed` to answer this.

The engine is therefore safety-plus-reachability only. **Fairness is unsupported**, so reachability
("can it reach `published`?") is in scope and liveness ("will it eventually publish?") is not — the
latter is not established without fairness assumptions, and the workbench must say so rather than
guess.

> **Still true of v0.1; the liveness half no longer describes the engine, 261004.** This document is
> the frozen v0.1 kernel, and the paragraph above stands as the v0.1 statement. The engine it
> describes has since gained an LTL foundation — `src/engine/ltl.ts`, `ltl-automaton.ts`,
> `ltl-trace.ts`, `ltl-product.ts` — under which liveness is **in** scope and a liveness property
> gets a verdict. Fairness remains out of scope, which is why the two are separated here rather than
> both struck, and v0.2 accepts the consequence openly: with every execution admitted, a liveness
> property can be refuted by a trace that postpones an enabled transition forever, and the
> counterexample is the lesson. §30's P5 is refuted on both machines for exactly that reason. The
> authority is `DESIGN-v02-ltl-foundation-261004.md` (§4 trace domain, §5 fairness, §8 verdicts);
> `PLAN.md` §2 carries the matching supersession on the Phase C must-not. Past-time operators are
> unchanged: the history-variable compilation above is still the mechanism, still disclosed under
> V23.
>
> **One bound, because it is the thing most likely to be assumed.** The foundation is not yet wired
> to any shipped surface, measured at 261004 rather than inferred. `mage-query.schema.json`'s
> behavior `form` enum is unchanged, so **no saved query can name an LTL property**;
> `src/engine/index.ts` re-exports nothing from the four modules; and no module under `src/` imports
> them at all — `explore.ts` mentions `ltl-product.ts` in a comment and that is the whole of it. The
> only importers are `test/acceptance-p1-p5.test.ts`, `test/ltl-bridge.test.ts` and the LTL suites.
> So liveness has verdicts, and today a reader obtains one by writing a test, not by saving a query.
> That is this wave's declared boundary — §7.4 of the foundation design enumerates what was to be
> added and a query form is not on the list — and not an omission of this section.

### 7.4 Queries are persistent artifacts

Saved queries live in the model system and re-run when the model changes. Engineering questions
become versionable alongside the models that answer them.

### 7.5 Many interfaces, one semantics

A model system may be asked questions through more than one interface: the analysis engine, and a
SPARQL 1.1 subset over the RDF projection. SPARQL is an **interface**, not the semantic foundation,
and the three rules below are what keeps the second interface from quietly meaning something else.

**V32 — the licensing gate reads the IR, and no interface bypasses it.** V7 refuses a multi-hop
question over a relation type declaring `composition.path: forbidden`. V32 fixes where that authority
lives: the **IR**, consulted before evaluation, for every interface over the same model.

Nothing in the RDF projection carries the refusal. A raw endpoint evaluates `mage:owns+` and returns
rows, so the refusal has to be a gate the question passes through rather than a `FILTER` the query
author may omit — **a licensing check a caller can forget is not a control.** Implementations SHOULD
hold this with a type: a question becomes runnable only by passing the gate, so an evaluator cannot be
handed an ungated one. Two interfaces deciding this rule separately MUST decide it identically, down
to the refusal sentence; a user who asks both and hears two explanations learns that one is guessing.

**V33 — a refusal names what is missing AND what would license the question.** A refusal is an object,
not a sentence: `outcome: unlicensed` plus the cause as data, the distinction the model lacks, and the
change that would make the question answerable. A refusal that only declines is a dead end.

Three causes V33 introduces, which a caller MUST be able to tell apart without reading English. The
vocabulary rung carries two more that predate this clause — a name nothing declares is
`unknown-vocabulary`, and one some `purpose.omits` covers is `missing-distinction`, which §7.6 ranks
above it:

| Cause | What it means | What it offers |
|---|---|---|
| **unlicensed by the model** | `composition.path: forbidden` (V7, V32) | declare composition allowed — a semantic claim the author owns |
| **outside the supported subset** | the question uses a construct this version does not accept | the construct, by name, and the accepted set |
| **not expressible as a relational question** | the question is behavioral | **routes to the engine** and says so |

The first and third MUST NOT be collapsed. One reports that the model declines to answer; the other
sends the asker to the interface that answers. A user told "unlicensed" when the truth is "the engine
answers that" concludes the tool cannot do something it does.

**V34 — query scope is stated per question, never defaulted.** System-level facts and each model's
relations occupy different graphs, so every question chooses between the **union** across models and
**one model's** graph. A claim about the system queries the union, and is therefore not escapable by
moving the offending edge into another model; a question about one purposeful reduction scopes to that
reduction. Implementations MUST make the caller state which. Choosing wrong is a silent wrong answer,
and a default picks for a caller who never considered the question.

### 7.6 When several refusals are true, which one the engine says

More than one refusal can be true of one question. A query may compose over a relation type whose
`composition.path` is `forbidden`, *and* reference a distinction a model declares omitted, *and* name
a type nothing declares — all at once. Every one of those sentences is true and the engine says one.
An author shown the least useful of three true refusals learns the least, so the choice is ruled
rather than left to the order the code happens to check things in.

**The ruling has two parts, and they compose.**

**By subject.** The engine refuses on the first subject of the query it cannot get past: the relation
type must resolve, then the form must be licensed, then the endpoints must make sense. This is not a
priority over causes — it is that a later subject cannot be judged until an earlier one resolves.
Composition is a property of a relation type, so it is unaskable about a type that does not exist; an
endpoint is only worth reading once the question it is an endpoint of is licensed. A user who
misspelled a relation type should not first be told about path composition.

**Within one subject, a declared decision outranks a bare absence.** When a name resolves nowhere in
the system and some model's or machine's `purpose.omits` covers it, the cause is
`missing-distinction` and the refusal quotes the author's own words. When nothing was declared about
it, the cause is `unknown-vocabulary` and the refusal says only that.

The reason is what the author does next. `unknown-vocabulary` sends a reader hunting for a
misspelling; `composition-forbidden` invites them to propose `composition.path: allowed`. Both of
those next steps are wasted when the thing the question needs was left out on purpose — the
misspelling does not exist, and licensing composition would not supply the missing distinction.
`missing-distinction` is the only one of the three whose next step is the real one: decide whether
this model should represent the omitted distinction at all. It names a decision somebody made, where
the other two name a lookup that failed.

So a refusal reports, in order of preference: a decision recorded about *this* question's subject,
then a decision recorded about the inference the question performs, then an absence nobody spoke
about. Worked, on the composing case: a `reachability` query over a `forbidden` type whose endpoint
is both undeclared and declared omitted refuses as `composition-forbidden`, because the form is
subject 2 and the endpoint subject 3 — the question is not askable in this model's licensing at all,
which makes what its endpoints name moot. The same endpoint on a `direct` query refuses as
`missing-distinction`, because subject 3 is reached.

**The ruling binds every rung, not the one a bug report named.** The engine has five places where a
name fails to resolve — the relation type, a `from`/`to` endpoint, the focus of
`predecessors`/`successors`, the focus of `components`, the focus of `containment` — and they route
through one refusal builder so the rule holds at all five. The SPARQL seam has four of its own: the
relation type, a containment entity, V34's model scope, and the graph IRI that scope arrives as. They
route through one builder too, and that builder CALLS the engine's coverage predicate rather than
restating it. One predicate, because the first thing two copies of a matching rule produce is one
interface saying "deliberately omitted" where the other says "not declared" — which is the defect
this section exists to rule out, and which is how the seam came to lack the rung in the first place.

**"Down to the refusal sentence" is literal, and it holds at every rung the two interfaces share.**
The relation type and the containment entity are subjects both of them have, and both produce the
same sentence byte for byte — the structural clause and the omission clause alike. The agreement test
compares the two strings for EQUALITY rather than for a shared substring, because the failure it
guards against is two explanations of one absence, and a substring match cannot see that.

One seam rung has no counterpart to agree with: V34's model scope exists only in the SPARQL
interface, since the engine and `validate.py` union across every model by construction and therefore
have no model name to fail to resolve. The ruling still binds it — a scope naming a model nothing
declares, where some purpose covers the name, refuses as `missing-distinction` and quotes the
declaration — but the testable invariant there is the cause plus the named omission, because there is
no second sentence in existence to match.

---

## 8. Purpose: what a model represents, and what it declines to

```yaml
models:
  service-flow:
    question: Which services may invoke which other services?
    represents: [service identity, permitted invocation]
    omits: [observed runtime calls, request payloads, call frequency, latency]
```

This supports the most distinctive query outcome in the workbench — **"cannot be answered from this
model"** as a *successful* result:

> No. This model represents permitted invocation but deliberately omits payloads. You would need a
> data-flow model, or payload semantics added here.

**V24 — `omits` is checked, not asserted.** `represents` and `omits` draw from the model's actual
vocabulary (property names, relation types, state names, variable names). A name listed in `omits`
that nevertheless appears in the model is an **error**; a name in `represents` that does not appear is
a **warning**.

Without V24 this feature decays into prose that rots: a model declaring `omits: [payloads]` while
carrying a `payload` property will confidently tell a student it cannot answer a question it can.
Checked, "cannot answer" becomes a derived claim with the same standing as every other analysis
result.

**`omits` is read at query time, not only at validation.** A declaration nothing consults is prose
with a rule attached. So when a query names something the system does not declare, **both
interfaces** consult every model's and machine's `omits` before refusing, and a covered need refuses
with cause `missing-distinction` quoting the declaration (§7.6 rules the precedence). This is what
makes Document Processing's §5.6 case answerable: the engine said *"relation type `cache_hit_frequency` is
not declared by this system"*, which is true and reads as a typo, where the model had already
recorded *"deliberately omits cache hit frequency"* — a modelling decision. Both facts now travel in
one refusal, with the decision as the cause.

**Coverage, not equality.** An omission is prose and a query names an identifier:
`omits: [cache hit frequency]` against `cache_hit_frequency`. Both sides reduce to lowercase
alphanumeric words, and **an omission covers a need when every word of the need appears among the
omission's words.** The direction is the authoring direction — a prose omission is longer and more
specific than the identifier a query uses — and requiring *every* need word is the guard against
guessing: `encryption_at_rest` against `omits: [encryption in transit]` contributes `rest`, which the
omission does not have, so it is not covered and the refusal falls back to the honest absence. A
looser rule would tell an author the model decided something it never considered, which is the same
wrong-reason defect in the other direction.

Consulting `omits` here is sound because of where it happens: the engine reaches this rung only after
failing to resolve the name across the whole system, so the premise V24 enforces per model — an
omission never names live vocabulary — is holding by construction at the only point the lookup runs.
V24 is what makes a surviving omission trustworthy; this reads it rather than re-deriving it.

### 8.1 Correspondence and provenance

```yaml
provenance:
  subject:
    kind: repository
    ref: src/services/remediation
  correspondence:
    kind: asserted          # asserted | checked | derived | generated
    checked: "2026-10-02"   # quoted: a bare date is implicit-typed (§10.1)
```

`kind` names how the correspondence between model and world was established. The schema admits four
values and defines none of them beyond one sentence: *"v0.1 permits `asserted`; the stronger kinds
are where later tooling earns trust rather than claiming it"*
([`mage-model.schema.json`](mage-model.schema.json), the `correspondence` definition). One record
has since earned `checked` — a gate re-derives its claim from the code on every run. What each kind
is worth, what reads the record, and what the workbench itself claims under this vocabulary is §13's
subject: the record is part of a model, but its *meaning* is a statement about engineering, not
about the model.

---

## 9. Agent protocol

```json
{
  "transaction": {
    "base": "sha256:…",
    "target": "main",
    "operations": [
      { "op": "set-label", "id": "service/remediation", "value": "Remediation Engine" },
      { "op": "add-transition", "machine": "document", "from": "processing", "to": "reviewed" }
    ],
    "semantics": { "atomic": true }
  }
}
```

Application order is fixed: **parse → verify `base` → apply to a temporary IR → validate the entire
resulting system → commit.** Any failure leaves the current system byte-identical.

- **`base` is a hash of the canonical IR, never the file bytes.** Comments and formatting are
  preserved on write (§10), so hashing the file would invalidate every pending transaction on a
  cosmetic edit.
- **`base` mismatch is a loud failure**, never a best-effort merge. An agent that computed a change
  against a system the user has since edited has to recompute it.
- Transactions are all-or-nothing and reversible, which yields undo/redo and an agent audit trail
  from the same mechanism.

The agent returns one of three things:

```ts
type AgentResult = Transaction | Query | Clarification;
```

`Clarification` matters: an agent that cannot determine a quantifier (V21) or a participant should ask
rather than guess. The agent's context carries the current system hash, the target branch or
hypothesis, the current selection, and the conversation so far — a single-shot `propose(system,
request)` cannot express "instead, success should move it to reviewed," which is the interaction the
workbench is for.

---

## 10. Persistence

- `.mage.yaml`, with JSON as an equivalent serialization of the same schema.
- **Comments and key order are preserved across tool writes.** Use a concrete-syntax-tree YAML
  library; parse-to-object-and-restringify is not acceptable for a representation advertised as
  Git-friendly and human-edited.
- The exported file is the portable source of truth. Browser storage is convenience state only.

### 10.1 YAML implicit typing is a correctness hazard, not a style issue

YAML 1.1 — which PyYAML and many other loaders implement — coerces several bare scalars to
non-strings. For a tool whose central artifact is a *state machine*, this is not a footnote:

| Written | Loads as |
|---|---|
| `on: acquire` | `{True: 'acquire'}` |
| `initial: off` | `{'initial': False}` |
| `states: {on:, off:}` | `{'states': {True: None, False: None}}` |
| `checked: 2026-10-02` | a date object, which JSON cannot represent |

A light switch with states `on` and `off` is the most natural state machine a student will ever write,
and it is destroyed before any schema sees it. Two consequences are therefore normative:

**V25 — reject ids that the loader would coerce.** Any entity, machine, state, event, variable or
domain id matching YAML's implicit-boolean or implicit-null set — `on`, `off`, `yes`, `no`, `true`,
`false`, `null`, `~`, and case variants — or which parses as a number, MUST be rejected at validation
with a message naming the cause:

> State id `off` would be read as boolean `false` by a YAML 1.1 loader. Rename it (`switch_off`), or
> quote it everywhere it appears. The workbench refuses it rather than risk loading a different model
> than you wrote.

Refusing is the honest choice: quoting works but depends on every future hand-edit remembering to do
it, and a silently coerced state id produces a model that validates and means something else.

**Dates and times are quoted strings.** JSON, the equivalent serialization, has no date type. Writers
MUST emit them quoted; readers MUST NOT rely on loader date coercion.
- Validation errors name the path and the cause: `document.transitions[4] references unknown state
  'approved'` — never merely "invalid YAML."

---

## 11. Non-goals for v0.1

UML or SysML compliance; arbitrary diagramming; code generation; reverse engineering; OCL; BPMN;
sequence diagrams; requirements management; collaborative editing; accounts; cloud storage; general
simulation; **fairness and liveness**; **past-time temporal operators**; **instance binding**;
**participant selection**; **quantitative evaluation**; real-valued or unbounded variables; SMT.

Each of the last seven is a deliberate, named limitation rather than an oversight, and each has a
refusal message so a user meets a clear boundary instead of a wrong answer.

**Quantitative evaluation** is the newest of them and the narrowest. Quantities are represented,
normalized and validated (§5.2); summing a trace's latency and evaluating `memory(c)` wait on two
questions the ruling leaves open, named at the end of that section.

---

## 12. Implementation boundary

The analysis engine runs in a **Web Worker** from the first commit. The UI owns editing, layout and
rendering; the worker owns state-space construction and query execution. Saved queries re-run on
change, and product exploration on the UI thread would freeze the tab.

**Layout stability is an acceptance criterion, not a polish item.** Stable ids feed deterministic
placement; existing positions are strong hints for incremental layout; a hypothesis renders on the
*same* layout with added, deleted and changed elements visually distinguished. The core interaction is
comparing before against after, and that comparison is unreadable if one added state re-ranks the
whole graph.

---

## 13. Engineering semantics: what a claim about the world is worth

The workbench involves three semantic layers, and the first two are fixed above. **Model semantics**
(§1–§6) says what a MAGE model means — relations, machines, the reachable set — independent of how
anyone queries it. **Query semantics** (§7) says what propositions can be evaluated over a model and
what `holds` / `refuted` / `inconclusive` / `unlicensed` mean; §7.2a's rule that each form has
exactly one denotation closes that layer. Both layers end at the model's edge: a verdict is a fact
about the *model*. **Engineering semantics** — this section — is the third layer: what
correspondence is claimed between those propositions and the actual engineered system, and with
what warrant. This is where `asserted`, a mechanically checked architecture edge, a value-flow
control, and an eventual machine↔code correspondence differ from one another.

The layer existed before this section did — as schema prose, gate headers, model comments and one
audit's certification — and leaving it scattered had a measured cost: sentences kept claiming
correspondence the gates never held. The repo's own exemplars record the defect class.
`src/ir/types.ts` states its enforcement bound "because this sentence has twice claimed more than
it held" (`src/ir/types.ts:14`), and the sixth kernel query's comment records that an earlier
version claimed a value-flow property its form cannot check
(`models/workbench-components.mage.yaml:528-535`). Neither failure was a layer-1 or layer-2 defect
— the models validated and the queries answered correctly. What failed had no vocabulary, so this
section writes the existing claims down. It records; it rules on nothing. Where a judgment is
genuinely open, it is listed in §13.6 rather than decided here.

This section is part inventory, and an inventory is dated: **the as-built statements below are
read at commit `7cd9e1e0` (2026-10-04)** and say so where a change in flight would move them.

**Citation staleness, found 261004 at `f3a9991c` and bounded rather than swept.** Three of the files
this section cites by line changed after `7cd9e1e0` — `test/import-graph.test.ts` (+24/−291),
`models/workbench-components.mage.yaml` (+48/−13) and `DESIGN-model-query-261002.md` (+56/−13) — so
**line anchors into those three no longer resolve** and must be re-read before reuse. The symbols and
the claims hold; the numbers moved. Three are re-verified at `f3a9991c` because the argument leans on
them: the K1 equality assertion is `test/import-graph.test.ts:363`, the one `checked` record is
`models/workbench-components.mage.yaml:376-381`, and §G5's heading is
`DESIGN-model-query-261002.md:753`. The remaining anchors into those three files are left as read at
`7cd9e1e0` rather than silently renumbered, because a re-pointed citation nobody re-read is the same
defect wearing a fresher number. Anchors into the other cited files — `src/ir/types.ts`,
`src/sparql/eval.ts`, `src/ir/canonicalize.ts`, `test/model-coverage.test.ts`,
`test/capabilities.test.ts`, `test/examples.test.ts`, `validate.py`, `../hooks/pre-push` — were
re-read at `f3a9991c` and hold.

### 13.1 The correspondence vocabulary

§8.1 gives the record; the schema admits `kind: asserted | checked | derived | generated` and fixes
one discipline in its description: *the stronger kinds are where later tooling earns trust rather
than claiming it.* The schema defines no kind beyond that sentence. The definitions in use are read
off the records that exist, which is all the definition v0.1 has:

| `kind` | In use | Meaning, as used | The record |
|---|---|---|---|
| `asserted` | yes | a person read the model and the world together, on a date; the `note` bounds how far the reading went | `examples/docable.mage.yaml:83-86` — "internals checked by inspection only" |
| `checked` | yes, once | a named gate re-derives the claim from the code on every run and fails on drift in both directions | `models/workbench-components.mage.yaml:374-386` |
| `derived` | no | — admitted by the enum, defined by no use | — |
| `generated` | no | — admitted by the enum, defined by no use | — |

**The earn-discipline has one worked instance.** The `checked` record follows the schema's
sentence exactly: its comment names the gate that earned the word (`test/import-graph.test.ts`
re-derives the edge set on every node-tier run) and rules out the stronger `derived` — "the edges
below are written by hand and the gate refutes them; nothing generates them." Until 261004 that
record said `asserted`; the gate landing is what moved it. The discipline itself is prose: nothing
mechanical checks that a stronger kind has a mechanism behind it (§13.2).

**The vocabulary has not caught up with the gates in one place.** The two *generated* self-models —
`models/workbench-affordances.mage.yaml` (from the capability registry) and
`models/example-coverage.mage.yaml` (from the shipped examples) — carry byte-exact staleness gates
(`test/capabilities.test.ts:532-538`, `test/examples.test.ts:878-885`), which is the strongest
correspondence in the repository: the committed bytes must equal a fresh generation from the code.
Yet neither model carries a `provenance.correspondence` record at all, so `generated` sits unused
in the enum while the two models it describes say nothing. Recorded as a gap, not closed here: the
generators own those bytes, so admitting the record is the generator owners' edit (§13.6, OQ2).

### 13.2 What reads the record — the enforcement status of the vocabulary itself

A vocabulary is worth what consults it. The honest inventory:

- **Shape is enforced.** `validate.py`'s shape pass validates every model against
  `mage-model.schema.json` (Draft 2020-12, `validate.py:259-260`), so a `kind` outside the enum is
  a finding. The pre-push hook runs it over every tracked `*.mage.yaml`
  (`../hooks/pre-push:194-205`).
- **The loader drops it.** Canonicalization reads `created_by`, `created_at`, `prompt`,
  `rationale` and `history` out of a provenance block and nothing else
  (`src/ir/canonicalize.ts:66-88`); the IR's `Provenance` has no subject and no correspondence
  field (`src/ir/types.ts:152-159`). The record therefore never reaches the engine, the hash, or
  any query — it is annotation in A1's sense (§5.1), carried, not interpreted. One visible
  consequence: a provenance block containing *only* `subject` and `correspondence` reaches the UI
  flagged `unreadable` — the source declares provenance the IR could read nothing out of
  (`src/app/provenance.ts`) — because every field the IR carries is empty.
- **One gate reads `subject.ref`.** `test/import-graph.test.ts` parses the model YAML directly —
  precisely because the IR does not carry the field — to get its scan root and the per-entity
  file-to-entity join (`test/import-graph.test.ts:29-33`).
- **No gate reads `kind`.** A model could claim `checked` with no gate behind it and every gate
  would stay green. The earn-discipline of §13.1 is held by review and by the one record's own
  comment — not by mechanism (§13.6, OQ1).

### 13.3 The claim kinds in practice, and the warrant each carries

The enum describes model records; the repository's correspondence claims are wider than its model
records. Five kinds are observed, each with a warrant and a bound. The bounds on the first kind are
the re-audit's certification bounds (`REAUDIT-system-models-261004.md`, "What this certification
does NOT cover"), restated here as the declared contract they were written to become.

**K1 — Mechanically checked (one claim today).** The `dependencies` model's `depends-on` edge set
corresponds to the observed import graph of `src/`. The gate asserts *equality*, both directions:
an undeclared import fails, and a declared edge no import creates fails
(`test/import-graph.test.ts:363`, re-verified at `f3a9991c`). The scan is a real TypeScript parse with its syntax coverage
enumerated and its not-covered cases reported rather than skipped (the file's header). The warrant
is per-run: at every node-tier run, observed = declared. Its bounds:

- **B1 — the universe of discourse is relative specifiers, with the alias channel closed by
  precondition, not resolved.** The scan resolves relative specifiers only; a tsconfig
  `paths`/`baseUrl` or package.json `imports` map would carry a real dependency past it
  (re-audit M4). A separate assertion in the same gate holds those config keys absent
  (`ALIAS_CHANNELS`, `test/import-graph.test.ts:777-807`; the real config asserted clean at
  `:896-897`). The equality
  claim is therefore *conditional*: it is total while that precondition test is green, and turning
  aliasing on is a red gate that names the channel, not a silent narrowing of the scan.
- **B2 — edge granularity, not value flow.** §13.4.
- **B3 — containment edits are structurally unguarded.** The only check on `contains:` is
  non-emptiness of the contained set (`test/import-graph.test.ts:726`); a `contains:` edit can
  merge two entities' checking domains with no gate naming the move (re-audit M6). The quant
  containment's sole-importer justification is prose in the model, checked by nothing.
- **B4 — the gate checks consistency, not goodness.** A real import plus its declared edge, landed
  together on a pair no query prohibits, passes silently (re-audit M5). The 13 asserted queries
  are defense-in-depth on the pairs they cover (a queried pair survives even a consistent
  both-sides edit, re-audit M11); for every other pair the model is the authority and editing it is
  reviewed by no machine. Certification covers the mechanism, not future model edits.

**K2 — Verdict-checked.** Every saved query carrying `expect`, in every tracked model outside the
shipped examples, is evaluated through the engine in CI and its outcome must match
(`test/model-coverage.test.ts`); the measure is mutation-verified by four distinct routes (re-audit
M1, M9a–M9c). This is a layer-2 warrant — the model answers what it says it answers — and the gate
says so itself: its receipt pairs the claim with "This does NOT prove any model corresponds to the
code" and a test holds the disclaimer in place so the numbers cannot travel without it
(`test/model-coverage.test.ts:118-126`, `:491-501`). Verdict-checking becomes engineering warrant
only where a K1 join exists; today that is the components model alone.

**Since 261004 the kind has two strengths inside it, and the split runs along query kind.** A `graph`
query in a tracked model is decided twice and held equal — once by the engine, once by `validate.py`
— which is what `npm run check:parity` buys. A `behavior` query was decided once, because
`validate.py` has no exploration engine and declines every one for scope. The LTL foundation closed
that asymmetry without anyone editing a model: `test/ltl-bridge.test.ts` enumerates
`models/*.mage.yaml`, and where a bridge equation makes a saved form and an LTL formula the same
question (`invariant p == G p`; `reach p holds <=> G not-p refuted`) it compares the shipped
evaluator against an independently implemented automaton-product walk, with disagreement a defect in
one of them by the one-denotation rule. Eight of the lifecycle model's nine rows are covered;
`deadend` is excluded for a stated reason. This raises the *warrant* of a K2 claim and moves nothing
on the correspondence axis — both implementations read the same model file.

**K3 — Generated from the code.** The affordances and example-coverage models: regenerate and
compare, byte-exact, on every run (`test/capabilities.test.ts:532-538`,
`test/examples.test.ts:878-885`). The warrant is exactly as strong as the generator's reading of
the code at HEAD — staleness is impossible; a generator bug is not. Neither model declares this in
the correspondence vocabulary (§13.1's gap).

**K4 — Asserted by reading.** A person, a date, and a note that bounds the reading
(`examples/docable.mage.yaml:83-86`). This is also the honest classification of every
correspondence sentence in model prose and code comments not named above: an assertion's warrant is
its author's reading at its date, and the house form is to state the bound with the claim — the
pattern `src/ir/types.ts:4-22` now follows after twice overclaiming.

**K5 — Declined, with the reason recorded.** `PLAN.md` §0.2a records what the workbench
deliberately does not model about itself: no quantities self-model until a gate can derive a
threshold from a model, and no transaction×hypothesis×workspace machine — earned, awaiting a ruling
on the model set. A declined claim is a correspondence decision too: recording it is what makes the
absence read as a ruling rather than a gap, the same move `omits:` makes inside a model (§8).

### 13.4 Granularity: what an edge can and cannot say

The components model speaks at **edge granularity** over typed relations, and the relation
vocabulary drew the distinction before it bit: `depends-on` (build-time reference; path composition
allowed; `models/workbench-components.mage.yaml:127-145`) is not `may_mutate` (authority to change
state; path composition forbidden; `:147-160`). An edge can express that a reference or an
authority exists or is absent, and — through §7's forms — what is reachable over the declared set.

What an edge cannot express is **which value crosses a sanctioned edge**. The model's sixth query is
where the two readings diverged in practice (`models/workbench-components.mage.yaml:523-547`). Asked
as reachability, `ui → yaml-adapter` *holds*, and legitimately — every edit is a document edit, and
the route through the transaction engine is the sanctioned one — so the assertable claim is
`form: direct`, no direct edge. And the re-audit's M10 shows what `direct` cannot hold: a one-line
re-export through the sanctioned intermediary moves the whole parse path into the view with both
declared edges untouched and every gate green. The model says this of itself — its `omits:` row
names `per-file import sites` and `value-vs-type import kind`
(`models/workbench-components.mage.yaml:365`), and the sixth query's comment states the bound and
records the byte-level control as a deliberate non-build, an open follow-up with its own design
owed (`:537-541`). At `7cd9e1e0` no value-flow control exists; a sibling wave is working exactly
this seam, so that sentence is the one in this section most likely to be true for the shortest
time.

### 13.5 What is not claimed

The complement, in §11's register:

- **No machine↔code correspondence.** No self-model carries a state machine (`PLAN.md` §0.2a), and
  no gate anywhere relates any declared machine to any code path. A machine's optional `entity:`
  link (V6) is correspondence *within* the model, not to the world.
- **No value-flow or information-flow analysis.** §13.4. The gates hold edge properties; nothing
  reasons about what flows across an edge.
- **No claim that every meaningful property of the implementation is modelled.**
  `test/model-coverage.test.ts`'s denominator is tracked model files and their queries, not the
  implementation's properties; the prose-invariant census outside the models (re-audit Q2) stays
  held by tests and code, and its green says nothing a model said.
- **No claim about future edits.** K1's warrant holds at each run under its preconditions (B1) and
  rules no future model widening good (B4).

### 13.6 Open questions

Recorded because deciding them here would be the overreach this section exists to prevent.

- **OQ1 — should the earn-discipline become a validation rule?** "A `correspondence.kind` stronger
  than `asserted` names the mechanism that earned it" is today schema prose plus one disciplined
  use, tested by nothing. It is *not* minted as V40 here: every V-rule in this document is
  implemented and citable by error messages, and an unimplemented V-number would itself be a claim
  of enforcement nothing holds.
- **OQ2 — should the generated models declare `kind: generated`?** The enum anticipates them;
  nothing writes it; the generators own those bytes, so the edit belongs to their owners, not to a
  prose wave.
- **OQ3 — is `checked` one kind or two?** The one record uses `checked` for "a gate refutes drift,"
  while its own note says the *date* records a hand-reading. If a second record ever wants
  `checked` on the strength of re-reading alone, the word is ambiguous between gate-checked and
  human-re-checked. Whatever value is admitted next should be worth exactly what a named mechanism
  can hold — the schema's sentence, applied to the vocabulary itself. §13.7 adds a third candidate
  that fits neither sense: a result transcribed from an external oracle nothing in CI can run, whose
  evidence a reader can reproduce by hand. It is recorded as input here and mints no enum value.
- **OQ4 — where this bears on §G5, which it does not decide.** §G5
  (`DESIGN-model-query-261002.md:718`) is a layer-2 question: what algebra, if any, composes query
  denotations. The composition line is held by the author pending an explicit semantics discussion,
  and this section is input to it, not a substitute. Layer 3 contributes one observation: a
  composite verdict's engineering warrant can be no stronger than the weakest correspondence among
  the models it reads, so if composition is ever admitted, the result shape will need somewhere for
  correspondence to travel — as coverage travels with every result today (§7.1). Nothing here
  presumes an answer to §G5 itself.

### 13.7 A second correspondence axis: construct to standard

Every kind above relates a model to the **engineered system**. The 261004 ruling on SysML v2 opens a
second axis that the same vocabulary measures but the five kinds do not cover: the correspondence
between a Workbench **construct** and the **standard concept** it realizes. The authority is
`DESIGN-v02-semantics-261004.md` §35, which carries the ruling, the construct-by-construct mapping,
and the fixture shape. Recorded here because §13 is where a correspondence claim's worth is stated,
and a reader asking "what is a MAGE relation, and who says so" needs the axis named.

The ruling in one line: the OMG specifications are normative semantic sources, the official Pilot
Implementation and standard libraries are reference conformance material, and **the Workbench takes
no runtime dependency on either**. Its rule — *borrowed semantics must have provenance* — has a
second half that this section is the natural home for: an extension must be labelled an extension
and MUST NOT be attributed to SysML or KerML. The relational query vocabulary, the LTL query form and
the pinned-property mechanism are extensions, and §35.4 says so row by row.

**What this axis is worth today, in the vocabulary above: `asserted`.** A borrowed construct's claim
that the cited concept means what we say is a person reading a specification on a date — K4 exactly,
and the house form applies unchanged: state the bound with the claim. It cannot reach `checked`,
because `checked` requires a gate that re-derives the claim per run, and with no runtime dependency
nothing in CI can execute the reference implementation. A fixture therefore splits the claim rather
than promoting it: the Workbench half becomes verdict-checked by landing a tracked model with
`expect` (K2, via `test/model-coverage.test.ts:171`), while the correspondence to the standard stays
`asserted`. §35.5 works the three enforcement rungs through; §35.6 and §35.6a give the fixture shape
and the field that records how a correspondence was established.

**As-built, 261004: three of the five borrowed rows now have a fixture, and the axis is still
`asserted`.** `conformance/` ships three (`conformance/manifest.json`), and the honest wording is
worth getting exactly right, because "it has a fixture now" is the sentence most likely to be read as
a promotion.

- **The correspondence is `asserted`, with better evidence than a bare reading.** What changed is
  not the kind but the *warrant*: each row now cites a clause of a named formal specification with
  its OMG document number, quotes the sentence or the declaration it rests on, names the
  machine-readable artifact where one decided it, and states a bound. A reader can reproduce the
  reading by hand. Nothing re-derives the standard's half per run, so §13.1's earn-discipline is
  unmet and the word does not change.
- **The MAGE half is `checked`, and only that half.** Each fixture's `model.mage.yaml` is an
  ordinary tracked model with pinned `expect`, so the coverage gate decides its verdicts on every
  node run. `test/conformance.test.ts` adds what `expect` cannot carry — that each verdict is
  sensitive to the meaning under test, by mutating the model and requiring the verdict to move when
  the meaning moves and hold still when it does not.
- **Three warrant rungs below `checked`, and they are not interchangeable.** The corpus records
  `oracle-executed`, `normative-artifact` (decided by OMG's normative machine-readable material —
  declared structure, multiplicities, values, invariants — with no prose step) or `spec-inspected`
  (the decisive step is a sentence). At 261004: **0 oracle-executed, 2 normative-artifact,
  1 spec-inspected.** No reference implementation ran. A `spec-inspected` fixture is not executable
  conformance and must not be described as such.
- **No enum value is minted, and that is deliberate.** §13.6's OQ3 asks whether `checked` is one
  kind or two; `normative-artifact` is a third candidate that fits neither of its senses, and it is
  recorded as further input to that question. Per OQ2's ruling, edits to the correspondence enum
  belong to the records' owners. The three method values live in `conformance/manifest.json`, which
  is the corpus's own vocabulary and not this document's.
- **Two rows are still `owed`, and since 261004 for two DIFFERENT reasons.** Both cells stay `owed`
  in §35.4 and both rows stay in the manifest, but the reason has stopped being one reason and the
  distinction is the whole of what a reader needs:
  - **`binding` now has a construct, and owes a clause and a fixture.** §14's bindings/compositions
    split landed 261004: `BINDINGS` and `COMPOSITIONS` are separately typed registries
    (`src/engine/model-types.ts`), and the three binding rows — `appears-in`, `machine-of-entity`,
    `state-of-entity` — share one `semanticBasis` declaring KerML's binding subset as borrowed, with
    its non-borrowed parts enumerated row by row. So "a fixture would describe a shape the Workbench
    does not have" is no longer true of this row; it is the fourth presently implementable fixture
    target, and its own declaration says so. What keeps it `owed` is narrower and is §35.4's standing
    reason rather than an absence of subject matter: `clause` is `CLAUSE_OWED` and `fixture` is
    `null`, because a clause written from memory reads as checked.
  - **`requirement, verification` has no construct to attribute yet.** Phase B's, per the same
    registry's own note, so the original reason survives unchanged for this row alone and a fixture
    would still describe a shape the Workbench does not have.

**The axis's claim about `src/` has changed, and the earlier absence is now historical.** At
`f3a9991c` the strings `SysML`, `KerML` and `semantic_basis` appeared nowhere under `src/`, `test/`,
`models/`, or either JSON schema, which is what made §35's first effect the *introduction* of
attribution rather than the correction of a false one. Re-measured 261004: `SysML`, `KerML` and
`semanticBasis` now appear in two files under `src/` and three under `test/`, carrying the eleven
registry declarations §35.5 placed. Two parts of the original reading still hold and are the
load-bearing parts: `models/` and both JSON schemas remain untouched, and the snake-case
`semantic_basis` — the YAML spelling — appears nowhere at all, which is §35.5's ruling that the claim
is about the *language* and so must not be authorable per model.
