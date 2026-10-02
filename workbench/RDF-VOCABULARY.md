# RDF-VOCABULARY.md — the RDF projection of a MAGE system

The workbench keeps four representations apart on purpose:

```
.mage.yaml      ->  Typed MAGE IR  ->  RDF Dataset  ->  SPARQL  ->  SMT
```

This document defines the third. The projection lives in `src/rdf/`; `test/rdf.test.ts` pins it.

**RDF is a projection, not a replacement.** `src/ir/types.ts` stays the application semantics. The
renderer, the validator, the transaction engine and the analysis engine all read the IR, and none of
them should prefer a quad to a field the IR already answers. What RDF buys is a standard relational
substrate: stable identity, typed resources, typed relations, properties, named graphs, and SPARQL
over all of it. Nothing more.

**RDF is not OWL.** No RDFS or OWL term appears anywhere in the output — no `subClassOf`, no
`domain`, no `range`, no `inverseOf`, no `TransitiveProperty`. Each would hand a reasoner licence to
add facts MAGE never asserted, which is the failure the engine's `unlicensed` outcome refuses one
layer up. MAGE fixes the meaning of its own vocabulary, and this file is where it does so. The one
borrowed term is `rdf:type`, which asserts membership and entails nothing on its own; SPARQL's `a`
abbreviates it, so declining it would have cost every agent the shorthand for no gain.

**The hash does not move.** The semantic revision hash is computed over the canonicalized typed IR
by `src/ir/hash.ts`. It is not computed here, and this projection is not part of it. Note the
direction of the asymmetry, because a reader will otherwise assume the stronger property: the hash's
semantic projection is *narrower* than the IR — it drops machine purposes, relation ids,
relation-type prose and the system name — so two systems with equal hashes can project to different
quad sets. **The quad set is not a revision token. `systemHash` is.**

---

## 1. The IRI scheme

Every IRI the projection mints has the shape

```
urn:mage:<kind>:<segment>[:<segment>…]
```

with each segment percent-encoded. Vocabulary terms use the reserved tag `v`:
`urn:mage:v:Entity`, `urn:mage:v:contains`.

### Why a URN

These IRIs name things; they do not locate documents, and nothing in the workbench ever dereferences
one. A URN says that in its scheme rather than in a paragraph, and it avoids minting identifiers
under a hostname whose owner could later publish something else at that address. The workbench is
also offline by design — no server, no daemon — so an `https://` identifier would promise a
retrieval that never happens.

The cost is small and worth stating: the `mage` NID is not registered with IANA, so a future
registration could collide. Migration is a one-constant edit (`URN_PREFIX` in `src/rdf/iri.ts`),
because no IRI is written down anywhere else.

### Why injectivity is the property that matters

Two distinct IR objects sharing one IRI merges them in every downstream query, and **nothing reports
it** — the answer is simply wrong, quietly. An entity named `idle` and a state named `idle` is the
case to keep in mind. Three things hold injectivity by construction:

1. **A closed kind tag leads every IRI.** The kinds are disjoint, so two objects of different kinds
   cannot meet. `v` is reserved for the vocabulary and is not a kind, so no author-chosen id can
   reach the vocabulary space and redefine `mage:label`.
2. **Segments are percent-encoded, so no segment contains the `:` separator.** An entity id `a:b`
   encodes to `a%3Ab`, which cannot be confused with two segments `a` and `b`. `encodeURIComponent`
   is injective — decoding recovers the input exactly — and it escapes `:`, `[` and `]`, the three
   characters MAGE ids actually hit (`instances: N` produces ids like `w[0]`).
3. **Each kind has a fixed segment arity.** Equal IRIs therefore imply equal segment tuples, and so
   equal source objects.

### The kinds

| Kind | Segments | Names |
|---|---|---|
| `urn:mage:sys:` | system | the system itself |
| `urn:mage:ent:` | system, id | an entity |
| `urn:mage:prop:` | system, key | a property KEY, used as a predicate |
| `urn:mage:rt:` | system, id | a relation TYPE, used as a predicate |
| `urn:mage:dom:` | system, id | a declared domain |
| `urn:mage:domval:` | system, domain, scalar-tag, value | one value of a domain |
| `urn:mage:model:` | system, id | a purposeful model |
| `urn:mage:graph:` | system, model | the named graph holding that model's relations |
| `urn:mage:mach:` | system, id | a state machine |
| `urn:mage:inst:` | system, id | an expanded machine instance |
| `urn:mage:state:` | system, machine, state | a control state |
| `urn:mage:var:` | system, machine, variable | a finite mutable variable |
| `urn:mage:deriv:` | system, machine, name | a derived value |
| `urn:mage:trans:` | system, machine, index | a transition |
| `urn:mage:guard:` | system, machine, transition index, guard index | one guard of a transition |
| `urn:mage:effect:` | system, machine, transition index, effect index | one effect of a transition |
| `urn:mage:event:` | system, id | a declared synchronized event |
| `urn:mage:query:` | system, id | a saved engineering question |
| `urn:mage:quant:` | system, id | a quantitative annotation |
| `urn:mage:acct:` | system, metric | one declared accounting basis, addressed by metric name |
| `urn:mage:dim:` | dimension | one of MAGE's five dimensions |

Five of these need their reasoning stated.

- **An accounting declaration is addressed by its METRIC name as written**, and is system-scoped
  because `CanonicalSystem.accounting` is a flat system-level map — v0.1 has one quantitative model
  per system, so there is no model segment to carry. §2 has the rest.
- **States, variables and derived values are machine-scoped.** Two machines may both have `idle`,
  and in a system where they do, one `idle` resource would make a configuration unreadable.
- **A transition is addressed by its index within its machine**, which is the address the IR itself
  uses: a delete operation names an index, and the hash treats a reorder as a different system.
  Guards and effects hang off that index by position.
- **A domain value carries a scalar-type tag** (`str`, `num`, `bool`) before the value. Five
  separate defects in this project came from YAML implicit typing — a bare `off` read as boolean
  false, a value truncated at an unquoted comma. A projection that let `5` and `"5"` name one domain
  value would be the sixth, and it would merge two values of one domain where nothing would look
  wrong.
- **A dimension carries no system segment**, and it is the only kind that does not. `duration` is
  MAGE's term rather than an author's: it means the same thing in every system, its base unit and its
  aggregation scope come from the dimension table in `src/ir/types.ts` rather than from any document,
  and no author can declare a sixth. Two systems in one store therefore share
  `urn:mage:dim:duration`, which makes a query over every duration quantity in the store a join
  rather than a union over system-local spellings. Injectivity is unaffected: the kind tag leads, so a
  one-segment `dim` IRI cannot collide with anything.

### What the scheme deliberately does not do

- **No blank nodes.** A blank node carries no identity outside the document that mentions it, and
  identity is the job RDF was brought in to do. Every resource gets an IRI, so a result row reads
  back in MAGE's own terms instead of as `_:b3`.
- **No language tags.** The IR has no natural-language channel — a label is a string, not a string
  in a declared language — so a tag would assert something the model never said.
- **Author-chosen names stay out of the vocabulary space.** The requirements sketch writes a
  property as `mage:accepts` and a relation as `mage:mayInvoke`. The projection writes
  `urn:mage:prop:docable:accepts` and `urn:mage:rt:docable:may_invoke` instead, because a model
  declaring a property named `label` or a relation type named `id` would otherwise collide with
  `mage:label` and `mage:id`. The sketch's shorthand is fine prose and a hazard in code.

---

## 2. The named-graph rule

Each purposeful model projects to its own named graph, and entity identity is **shared** across
them. From the requirements:

> Different questions require different reductions. Shared identity allows those reductions to
> compose.

The rule the projection applies:

> A quad lands in model M's named graph exactly when its truth is relative to M's reduction.
> Everything else lands in the default graph.

**Working it out from the IR's shape.** `CanonRelation.model` is the only field in `CanonicalSystem`
that carries a model — entities, relation types, domains, machines, instances, events and queries all
sit in flat system-level maps, and `relations` is a single flattened list annotated with which model
each edge came from. So the IR itself says which facts are model-relative: the relations, and nothing
else. An entity's existence, type, label, properties and containment hold whichever reduction you
adopt. A machine is not declared inside a model at all.

That leaves one judgement call, and it goes to the default graph: a model's own metadata — its label,
its purpose, its `represents` and `omits`, its entity scope, the handle for its graph. Those describe
the reduction; they do not assert anything inside it. Putting them in the named graph would mean a
query had to enter a graph to learn what that graph is for.

So the split is:

| Default graph | Named graph `urn:mage:graph:<sys>:<model>` |
|---|---|
| system; entities, types, labels, properties, containment | the typed relation edges of that model, and only those |
| relation-type declarations (including `pathComposition`) | |
| domains and their values | |
| machines, instances, states, variables, derived values, transitions, guards, effects | |
| events and their participants | |
| saved-query existence | |
| model metadata: label, purpose, scope, graph handle | |
| quantities, and the dimensions they use | |
| the declared accounting bases | |

### Quantities are system-level facts, for every target kind

A quantity targets a transition, a relation, an entity, a state, a parameter or a model, so the
question has to be asked target kind by target kind. The answer comes out uniform, and the reasoning
is worth keeping because a wrong answer here is a cross-model query that either misses quantities or
finds ones it should not.

**The IR's shape says it first.** `CanonicalSystem.quantities` is a flat system-level map, exactly
like entities, machines and events. `CanonRelation.model` is still the only field in the IR carrying a
model. No quantity names a reduction, so there is nothing to put a quantity in a named graph *with*.

**And the meaning agrees.** A quantity asserts something about the modeled system — the cache really
does hold 128 MB, the gateway really does take 100–500 ms — not about a reduction of it. Its truth is
not relative to which model you adopt, which is precisely the test the named-graph rule applies.

Two target kinds look like exceptions and are not:

- **`relation:`** is the tempting one, because the relation named lives in some model's graph. But
  `relations` is flattened across every model, so one relation id can name edges in two models, and a
  quantity on it would have to pick one or be duplicated into both. Picking is arbitrary;
  duplicating makes `SUM` double. The latency of a gateway call is a fact about the call, and the
  reductions are where it is *visible*, not where it is *true*.
- **`model:`** targets the reduction itself. That is the case model metadata already settled: a
  model's label and purpose describe the reduction rather than asserting anything inside it, and they
  go in the default graph for the same reason. Putting a quantity about a model inside that model's
  graph would mean entering a graph to learn something about the graph.

The cost, stated plainly: a quantity on a relation does **not** scope to that relation's model, so
"the latency of the edges in model M" is not a graph-scoped query. It needs a join from
`mage:target` to the relation, and v0.1 cannot do that join at all — see §7.

### The declared accounting basis is a system-level fact too

`accounting: { latency: { basis: entities } }` is the author's declaration of **how** a metric's
annotations reach an analysis (V35, ruled in `DECISIONS-RULED-quantities-261002.md`). It is declared
per quantitative model rather than per quantity, so where it lands is a judgement call and not a
reading off the IR's shape. It goes in the **default graph**.

**The IR's shape says it first, again.** `CanonicalSystem.accounting` is a flat system-level map
keyed by metric name, exactly like `quantities`. `CanonRelation.model` is still the only field in the
IR carrying a model. No accounting declaration names a reduction, so there is nothing to put one in a
named graph *with*.

**And the meaning agrees, for the reason model metadata already established.** A basis states the
rule by which the numbers are charged; it does not assert anything inside any reduction. A statement
*about* a reduction, placed inside that reduction's graph, reads as a statement *within* it — the
exact confusion §2 avoided for a model's label and purpose, and §2's quantity subsection avoided for
a `model:` quantity. Worse here than there, because the fact is a *rule*: a cross-model query would
find or miss the rule by which its own numbers are summed depending on which graphs it scoped to,
which is an arithmetic error rather than a missing row.

**It is a resource, not a predicate on the system.** Flattened, the declaration would need one
vocabulary term per metric name — `mage:latencyBasis`, `mage:costBasis` — and a new term for every
metric added later. One term per IR field is the rule of §4, and `accounting` is one field. The
resource also gives the declaration's own `mage:dimension` a subject to hang on, which is the join
the declaration exists for:

```
acct:s:latency  rdf:type              mage:Accounting
acct:s:latency  mage:id               "latency"
acct:s:latency  mage:accountingBasis  "entities"
acct:s:latency  mage:dimension        dim:duration     # -> the quantities it charges
```

The metric name is the address even when it names no path-aggregated metric. `accounting: { memory:
… }` is a plausible mistake and a V35 finding, and it is a finding *about a declaration the author
made* — a dataset that could not address it would disagree with the validator about whether anything
was declared at all.

**What changes when quantities become model-scoped.** v0.1 has exactly one quantitative model per
system, which is why the declaration is a top-level block and why this section's question has an easy
answer. When quantities scope to a model the declaration moves with them, and the named-graph
question becomes real rather than settled by the IR's shape. Revisit it then; the reasoning above is
about where a *rule* belongs, and it will still apply.

### Two consequences to know before writing a query

**The default graph holds no relation edges.** A default-graph basic graph pattern over a relation
type matches nothing. This is deliberate. The engine's adjacency unions across every model so that
an architectural claim cannot escape by moving an edge to another model, and the SPARQL equivalent of
that union is an unscoped `GRAPH ?g { … }`. Had the projection also materialised every edge into the
default graph, a default-graph query would silently answer with a *subset* of the union whenever a
dataset held more than one system, and `COUNT` would double. Silence beats a confident subset.

**Composition licensing is not in the graph structure.** Nothing in RDF knows about
`composition.path: forbidden`. A raw endpoint will cheerfully evaluate `rt:owns+` and the workbench's
most distinctive behaviour — refusing a question the model does not license — disappears. The
projection therefore puts `mage:pathComposition` on every relation type in the default graph, so the
gate that must sit in front of the evaluator has a fact to read rather than a convention to
remember. The gate is the query layer's job; supplying it the fact is this layer's.

**Symmetry is declared, not materialised.** A symmetric relation type gets
`mage:symmetric true`; the projection does not emit the reverse edge. Materialising it would double
the dataset and make `COUNT(?edge)` answer a question nobody asked, and the reverse edge has no
source in the IR. A query builder reading `mage:symmetric` emits `(rt:x|^rt:x)`, which is plain
SPARQL and needs no inference.

---

## 3. A transition is a reified object, and also a one-hop edge

The requirements raise both representations and settle neither:

```
transition17 rdf:type Transition      # identity preserved
transition17 from processing
transition17 to reviewed
processing canTransitionTo reviewed   # derived, convenient for graph queries
```

**The ruling: reify, and emit the derived edge alongside it.**

**Reification is not optional, because of the guards and the effects.** A guard is a triple
(`ref`, `op`, comparand); an effect is a target variable plus an expression; a transition also
carries a label and an optional `sync`. None of them has anywhere to attach on a bare
`processing -> reviewed` edge. Worse, two transitions between the same pair of states — one guarded,
one not — would collapse into one edge, and `processing -> reviewed` would lose the fact that it
requires the worker to hold the document. That is a semantic loss, not a convenience loss.

**The derived edge earns its place as a restatement, not an inference.** `mage:canTransitionTo` holds
between two states exactly when the machine declares a transition between them. It is a total
function of the reified transitions: no reasoner computes it, and a consumer can check it. It makes
"which states follow `processing`?" one pattern instead of a two-hop join, which is what the
requirements meant by "useful for graph queries".

**And it declares itself non-composing.** `canTransitionTo` says nothing about *enabledness* — a
guard may make every such step infeasible, and the retry transition in the worked example requires
`retry_count < 3`. So `canTransitionTo+` would be a reachability claim the machine never made:
exactly the class of question the relation-type machinery refuses. The projection therefore emits

```
mage:canTransitionTo  mage:pathComposition  "forbidden"
```

in the default graph. The licensing gate then reads one kind of fact for both author-declared
relation types and MAGE-derived predicates. Behavioural reachability is the engine's `reach` form,
with a trace as evidence; it is not a property path.

**Relations are NOT reified, and the reason is instructive.** A relation has an optional author id,
so reifying on it is tempting. But `hash.ts` keys a relation on `(type, from, to, model)` and
excludes the id — so the id is not part of semantic identity. Minting a resource from it would let
the quad set move while the hash stood still, which is the one direction of drift a reader would not
expect. If a later phase needs an anchor for a quantity on a relation (§5 allows quantities on
relations), the IR has to make the relation id semantic first. Until then, a relation is the typed
edge the requirements sketch shows, in its model's graph, and nothing else.

---

## 4. The vocabulary

Small on purpose: one term per IR field, and no term whose meaning this file cannot state. A term
nobody defined is a term that will be queried with a meaning the projection did not intend. The test
`every vocabulary term is defined in RDF-VOCABULARY.md` keeps the two halves joined mechanically.

No inverse term is materialised anywhere. `mage:contains` has no `containedBy`, `mage:from` no
`isFromOf`. SPARQL traverses backwards with `^` already.

### Classes

Used only as the object of `rdf:type`.

| Class | Means |
|---|---|
| `mage:System` | one model system: one identity namespace and the models over it |
| `mage:Entity` | a member of the identity namespace. Ids are immutable; labels are not |
| `mage:Property` | a property KEY an author used, not a value. Carries the declared value domain |
| `mage:RelationType` | a declared relation type, used as a predicate on entities |
| `mage:Domain` | a declared finite domain |
| `mage:DomainValue` | one member of a domain. A named thing, so it has identity |
| `mage:Model` | a purposeful reduction over the entity namespace |
| `mage:Machine` | a finite state machine |
| `mage:MachineInstance` | one expansion of a machine under its multiplicity |
| `mage:State` | one control state of a machine |
| `mage:Variable` | a mutable variable with a finite enumerated domain |
| `mage:DerivedValue` | a recomputed value. Never stored, never part of state identity |
| `mage:Transition` | one transition, identified by its index within its machine |
| `mage:Guard` | one condition on a transition, over the PRE-state |
| `mage:Effect` | one write a transition performs |
| `mage:Event` | a declared synchronized event with named participants |
| `mage:Query` | a saved engineering question |
| `mage:Quantity` | a quantitative annotation over the model. Never part of the state vector |
| `mage:Accounting` | one declared accounting basis, for one path-aggregated metric |
| `mage:Dimension` | one of MAGE's five dimensions. Carries its base unit and its aggregation scope |

### Properties

| Term | Subject | Object | Means |
|---|---|---|---|
| `mage:id` | any resource | string | the object's MAGE id, so a result row reads back without anyone parsing an IRI |
| `mage:label` | system, entity, model, transition | string | display name. Mutable, unlike the id |
| `mage:declares` | system | resource | membership: this system declares that top-level resource |
| `mage:entityType` | entity | string | the author's free-form type word (`service`, `component`). MAGE declares no taxonomy |
| `mage:contains` | entity | entity | containment, parent to child, one direction only |
| `mage:description` | relation type | string | prose description |
| `mage:absence` | relation type | string | what the ABSENCE of an edge of this type means — the half of a model that is easiest to lose |
| `mage:pathComposition` | relation type, `mage:canTransitionTo` | `"allowed"` / `"forbidden"` | whether a multi-hop question over this predicate is licensed at all |
| `mage:symmetric` | relation type | boolean | declared symmetric. The reverse edge is NOT materialised |
| `mage:acyclic` | relation type | boolean | declared acyclic |
| `mage:domainKind` | domain | `"enum"` / `"ordered-enum"` / `"boolean"` / `"integer"` | which kind of domain |
| `mage:domainValue` | domain | domain value | membership: this value belongs to this domain |
| `mage:value` | domain value | typed literal | the scalar the domain value stands for |
| `mage:ordinal` | domain value, machine instance | integer | zero-based position in a declared order |
| `mage:rangeMin` | domain, quantity | number | inclusive lower bound: of an integer domain, or of a quantity's range |
| `mage:rangeMax` | domain, quantity, dimension | number | inclusive upper bound: of an integer domain, of a quantity's range, or a dimension's V29 ceiling |
| `mage:valueDomain` | property key | domain | the domain this key's values are drawn from |
| `mage:question` | model, machine | string | the engineering question it exists to answer |
| `mage:represents` | model, machine | string | a distinction the author claims this reduction preserves |
| `mage:omits` | model, machine | string | a distinction the author claims it drops |
| `mage:graph` | model | graph IRI | the named graph holding this model's relations |
| `mage:includes` | model | entity | an entity in this model's declared scope |
| `mage:describes` | machine | entity | optional correspondence to an entity. Not identity: machines are not entities |
| `mage:initialState` | machine | state | the initial control state |
| `mage:state` | machine | state | a declared control state |
| `mage:variable` | machine | variable | a declared mutable variable |
| `mage:derived` | machine | derived value | a declared derived value |
| `mage:transition` | machine | transition | a declared transition |
| `mage:instanceCount` | machine | integer | declared multiplicity |
| `mage:instance` | machine | machine instance | one expansion |
| `mage:variableKind` | variable | `"boolean"` / `"integer"` / `"enum"` | which kind of variable |
| `mage:permittedValue` | variable | typed literal | one value the variable may take. Enumerated, because a finite domain is a list and not a promise |
| `mage:initialValue` | variable | typed literal | its value in the initial configuration |
| `mage:expression` | derived value, effect, quantity | string | the expression verbatim. The engine owns the grammar |
| `mage:transitionIndex` | transition | integer | position in the machine's transition list. Semantic: a reorder is a different system |
| `mage:from` | transition | state | source state |
| `mage:to` | transition | state | target state |
| `mage:sync` | transition | event | the event this transition synchronizes on. Synchronization, and nothing else |
| `mage:guard` | transition | guard | a condition the transition requires |
| `mage:effect` | transition | effect | a write the transition performs |
| `mage:ref` | guard | string | the guard's dotted reference, verbatim |
| `mage:op` | guard | `"eq"` / `"ne"` / `"lt"` / `"le"` / `"gt"` / `"ge"` | the comparison |
| `mage:comparand` | guard | typed literal | the scalar compared against |
| `mage:targetVariable` | effect | variable | the variable the effect writes |
| `mage:canTransitionTo` | state | state | the machine declares a transition between them. Declared adjacency, NOT enabledness and NOT reachability |
| `mage:participant` | event | machine | a machine that must take part |
| `mage:target` | quantity | string | what the quantity annotates, as written: `entity:cache`. Verbatim, and not resolved — see §7 |
| `mage:targetKind` | quantity | `"transition"` / `"relation"` / `"entity"` / `"state"` / `"parameter"` / `"model"` | the typed prefix. Withheld when the prefix is not one of the six |
| `mage:dimension` | quantity, accounting | dimension | which dimension the magnitude is in, or which one a metric accounts for. Withheld when the declared word is not one of the five, and when a metric name is not a path-aggregated metric |
| `mage:valueKind` | quantity | `"point"` / `"range"` / `"expression"` / `"absent"` | which shape of value the author wrote |
| `mage:magnitude` | quantity | number | a point magnitude, in the dimension's BASE units |
| `mage:residency` | quantity | `"resident"` | charged in every configuration where the annotated thing exists. Withheld when the author's word is not in the closed vocabulary |
| `mage:chargedWhile` | quantity | state | charged exactly while that state is active. An IRI — the only reference the projection resolves |
| `mage:accountingBasis` | accounting | `"entities"` | which target kind this metric's accounting charges. Withheld when the author's word is unreadable |
| `mage:baseUnit` | dimension | string | the unit every magnitude of this dimension is in. Withheld when dimensionless |
| `mage:aggregationScope` | dimension | `"configuration"` / `"execution"` / `"structural"` | which axis this dimension aggregates along |

### Three rules the table cannot show

**A property value drawn from a declared domain gets identity; one without gets a literal.**

```
ent:gateway     prop:accepts  domval:docable:sensitivity:str:public
ent:model-ir    prop:layer    "kernel"
```

A value the author drew from a declared domain is a named thing in the system, so it is addressed and
not spelled out. This is also what makes the one real cross-model join in the worked example sound:
`restricted > public` needs the ordinal, the ordinal lives on the domain's own value resource, and
the domain is baked into that resource's IRI — so the join cannot drift across two domains that spell
a value alike. Joining on the literal `"public"` would do exactly that, and would answer a question
about an unrelated vocabulary.

**An ordinal is emitted for an `ordered-enum` and for nothing else.** Declaration order is the order
only where the author declared it so. Emitting ordinals for a plain enum would license `>` between
two values the model never ranked — the same shape of over-reach as a transitive `owns`. Membership
(`mage:domainValue`) is still projected for every domain; the values exist, they are simply not
ranked.

**A quantity is a structured resource, and the dimension travels with the number.** This is Q6 of
`DESIGN-quantities-261002.md`, ruled in `DESIGN-sparql-261002.md` §5.

```
quant:s:cache-memory  rdf:type       mage:Quantity
quant:s:cache-memory  mage:target    "entity:cache"
quant:s:cache-memory  mage:dimension dim:memory
quant:s:cache-memory  mage:magnitude 1.25E-1          # 128 KB, in MB
dim:memory            mage:baseUnit  "MB"
dim:memory            mage:aggregationScope "configuration"
```

The alternative was a bare literal — `ent:s:cache mage:latencyMs 250` — and it loses the dimension,
at which point SPARQL can add milliseconds to megabytes. V30 forbids exactly that at the validation
layer, so a flattened projection would silently permit what validation forbids: the worst kind of
layering mistake, because each layer looks correct on its own. Relation types already set the pattern
— `mage:pathComposition` and `mage:symmetric` are projected as facts rather than folded away.

It costs query ergonomics, and the trade is deliberate. **There is no convenience literal alongside
it.** Two representations of one fact is the duplication this projection exists to avoid, and the
convenient one would be the one that loses the dimension.

Four specifics:

- **A magnitude is in BASE units, always, and never the authored unit.** `250 ms` and `0.25 s` are one
  quantity: `src/ir/hash.ts` says so and normalizes for that reason, and the projection must agree or
  a unit rewrite would move the quad set while `systemHash` stood still. A test asserts the two
  spellings project to byte-identical N-Quads.
- **The base unit lives on the dimension, once.** That is what makes `mage:magnitude 250` readable at
  all: the number is meaningless without the unit, and repeating `"ms"` on every duration quantity
  would be one fact in N places, able to disagree with itself.
- **The aggregation scope lives on the dimension too**, and for a sharper reason: the IR *derives* it
  from the dimension and forbids an author from choosing it per quantity. Copied onto each quantity,
  a later bug could emit a `ratio` quantity scoped `execution`, and the dataset would carry a
  contradiction nothing would report. One hop reaches it —
  `?q mage:dimension/mage:aggregationScope ?scope` — and it cannot be wrong. The field is not
  decoration: a consumer that cannot see the scope could sum a hit rate along a path, which is the
  category error the typed scope exists to refuse.
- **A range is two bounds and does not collapse.** `range: [100 ms, 500 ms]` projects `mage:rangeMin`
  and `mage:rangeMax`, never one number. A maximum analysis reading a collapsed lower bound reports a
  latency the model never claimed, and nothing looks wrong.

**A magnitude that did not reach base units projects no magnitude.** §7 of the quantities design: a
quantity reaches anything downstream in base units or not at all. A literal the dimension could not
normalize — `250 millisec`, a `KB` on a `duration` — has no base, so no magnitude quad is emitted.
This is the dangling-reference rule of §5 applied to a number: the resource exists, and content
triples come only from a declaration that carries them. `mage:valueKind` is what keeps *failed to
normalize* distinguishable from *no value declared*: the first projects `"point"` with no magnitude,
the second projects `"absent"`. An unrecognized dimension is treated the same way — the quantity
projects in full with no `mage:dimension`, because minting a sixth dimension resource would advertise
a base unit and a scope it does not have.

**When a quantity is charged is declared, and the charge condition is a REFERENCE.** Q3's ruling
refused both available defaults — "I would not say 'idle service memory stays resident' or 'idle
service memory disappears.' Neither is something MAGE can infer from 'service'" — so the two summands
of `memory(c)` are two authored declarations, and V37 makes a memory quantity declaring neither
*invalid* rather than inert. The projection carries both, as two different predicates:

```
quant:s:cache-memory        mage:residency     "resident"
quant:s:remediation-memory  mage:chargedWhile  state:s:document:remediating
```

The gap this closed is worth naming, because it was a *disagreement between layers* rather than a
missing field: the validator knew which summand a quantity entered and the dataset did not, so
*which quantities are charged only while remediating?* could not be asked of the projection even
though the IR held the answer and V37 enforced its shape.

- **`mage:chargedWhile` is the one reference the projection resolves**, and it is the exception that
  proves §7's rule rather than breaking it. §7 refuses to resolve `mage:target` because that one
  predicate spans six target kinds and only two of them can be resolved at all, so resolving would
  leave a query answering confidently for entities and silently for transitions. `when.state` names
  exactly one kind — a state, always — so resolving it is total *within its own predicate*, and
  nothing is a confident subset of anything. Projected as the author's bare string, the condition
  could not reach the state's machine, its transitions or its adjacency, which is the one useful
  thing about having a charge condition in a graph at all.
- **The resolution is V37's, not a guess.** `<machine>.<state>` carries the whole address; a bare
  name resolves only when exactly one machine declares that state, and a bare name two machines
  declare is **refused** rather than assigned to the first. Picking would hang the charge on an
  arbitrary machine's state and nothing downstream would report the wrong answer — the silent-merge
  failure the IRI scheme exists to prevent. V27 is what tells the author to qualify it.
- **The dotted form mints unconditionally**, so §5's dangling-reference rule holds here too: a
  `when.state` of `ghost.remediating` projects a state IRI with no `rdf:type`, which is exactly what
  an undeclared state is. The join a consumer writes is therefore
  `?q mage:chargedWhile ?s . ?s a mage:State`, and that typed form binds exactly the references the
  validator accepts. `test/rdf.test.ts` asserts that equivalence against `checkQuantities` directly,
  because the projection's resolver and the validator's `stateFault` read one reference for two
  different outputs, and two resolvers are how two resolvers come to disagree. The unification belongs
  in the IR, which owns reference semantics.
- **An unreadable word is not projected, and the author's string is not projected beside the IRI.**
  `residency: transient` is a declaration the author made and got wrong; V37 is the channel that
  quotes an author's own text, exactly as V28 quotes an unrecognized dimension. And there is no
  convenience literal alongside `mage:chargedWhile`, for the reason there is none alongside
  `mage:magnitude`: two representations of one fact is the duplication this projection exists to
  avoid, and the convenient one here is the one that cannot be joined.
- **No discriminator is projected for the charge**, unlike `mage:valueKind`. A value is present on
  every quantity and its *shape* is what `valueKind` discriminates; residency is optional, and its
  absence is itself the fact V37 reports. A `mage:chargeKind "when"` on a quantity whose reference
  resolved to nothing would advertise a condition a consumer cannot follow. *Which* memory quantities
  declare no charge is the validator's question, and it has a channel for it.

---

## 5. Totality, determinism and dangling references

`project(system)` is **total**: every field is projected with no precondition, for any
`CanonicalSystem` — including the ones `canonicalize` builds out of garbage. Refusing here would make
the projection depend on validation, and the two would drift.

The rule for a reference to something undeclared: **minting the IRI is the reference, and content
triples come only from the declaration.** A transition naming an undeclared state projects to a quad
whose object is a state IRI with no `rdf:type` and no `mage:id` — which is precisely what an
undeclared state is. The validator is the component that calls it a finding.

One exception, stated because it is an exception: `mage:value` on a domain value is supplied by the
*assertion* as well as by the domain's declaration. Withholding it would lose the scalar entirely
when the domain is missing or does not list that value, and the assertion does carry it.

**A dimension resource is the one resource no `mage:declares` edge reaches**, and it is emitted only
for a dimension some quantity actually used. MAGE owns the five dimensions; no author declared them,
so a `declares` edge from the system would be false. Projecting the whole table unconditionally would
put facts about MAGE into a dataset about a system, and would mean a system with no quantities no
longer projected what it projected before quantities existed — the same reason
`mage:canTransitionTo`'s composition policy appears only once a transition has been projected.

`project` is **deterministic**: the same system gives the same quads, and `toNQuads` gives the same
bytes. Three things hold it, and all three are tested:

- Canonicalization already sorts the IR's maps and relation list, so authoring order never reaches
  here.
- `canonicalDataset` deduplicates (an RDF dataset is a set, and a property key declared by two
  entities must appear once) and sorts on a total key.
- `toNQuads` canonicalizes on the way out rather than trusting its caller, so determinism is a
  property of the function and not a promise kept somewhere else.

**Annotation does not reach the projection at all.** Notes and provenance are excluded, for the same
reason the hash excludes them: invariant A1 says annotation must not alter interpretation or
analysis, and a projected note would let a SPARQL result depend on a comment. A note saying something
is an assumption does not make that assumption part of formal analysis; if it must constrain a query,
it has to be represented formally.

---

## 6. N-Quads

The serialization is hand-written (`src/rdf/nquads.ts`). The format is line-oriented and small —
`<s> <p> <o> <g> .` per line, UTF-8, no prefixes — and the escaping is the only part with teeth.

- **A plain quoted literal means `xsd:string`**, per RDF 1.1, so the datatype is omitted there and
  written out everywhere else. A consumer must never have to guess at an integer or a boolean.
- **Non-ASCII is emitted raw.** N-Quads is UTF-8 and an IRIREF admits non-ASCII directly, so
  escaping `é` would only cost legibility. Iteration is by code point, which is what keeps an astral
  character from being split into lone surrogates.
- **Escapes are reserved for characters that would break the grammar**: the backslash, the double
  quote, and the non-printing characters. `\n`, `\r`, `\t`, `\b` and `\f` use the ECHAR forms; any
  other control character, and DEL, use `\uXXXX`.
- **A number is typed by what it is.** An integer goes out as `xsd:integer`; anything else as
  canonical `xsd:double`. The workbench forbids reals in v0.1, so a non-integer here is malformed
  input the validator reports — and a consumer must not be able to read `2.5` back as `2`.

The round-trip tests decode with `JSON.parse`, deliberately: every escape the serializer emits is
also a JSON escape, so JSON's decoder is an independent oracle. A round-trip through a parser written
in the same subtree would prove only that two bugs agree.

---

## 7. What is NOT projected, and why

The honest list. Each of these is a deliberate omission, not an oversight.

| Not projected | Why |
|---|---|
| notes and provenance | invariant A1 — see §5 |
| `SavedQuery.raw` | it is `unknown`. The query schema is a separate document with no typed IR yet, so there is nothing typed to project. Existence and id ARE projected, so "which questions does this system ask?" still answers |
| relation ids | excluded from the semantic hash, so reifying on one would let the quad set move while semantic identity stood still — see §3 |
| `CanonEntity.parent` | the derived inverse of `contains`. SPARQL has `^` |
| `CanonVariable.machine`, `CanonTransition.machine` | already carried by the owning machine's edge and by the IRI |
| resolved guard references | `mage:ref` keeps the dotted string verbatim. Resolving `worker.state` to an instance and a variable is the engine's job, and two resolvers are how two resolvers come to disagree |
| guard, effect and quantity expressions, parsed | same reason. `mage:expression` is the author's text; the grammar is the engine's. So a quantity an expression references is not an edge in the dataset either |
| a quantity's target, resolved to the thing it annotates | four of the six target kinds have nothing to resolve to — see below |
| a magnitude's authored spelling and unit | `mage:magnitude` is the normalized value. §7 of the quantities design makes the authored unit cosmetic, and the author's text is the *finding* channel: V28 quotes it out of the IR, where it is kept |
| the declared dimension word when it is not one of the five | same reason, and symmetrically: the quantity simply has no `mage:dimension` |
| a `residency:` or `basis:` word that is not in its closed vocabulary | same reason again: V37 and V35 quote the author's text out of the IR, and a projected `"transient"` would be a residency a query could filter on |
| a `when.state` reference the projection could not resolve to one state | §4. A bare name two machines declare names no single state, so there is no IRI to mint and no bare string worth minting instead |
| a discriminator for which charge a quantity declared | §4. Residency is optional and its absence is V37's finding, not a shape a consumer reads |
| configurations, traces, query results | the state space is constructed, not stored. A projection of an exploration would be a second home for an answer that already has one |

### The one thing that could not be projected faithfully: a quantity's target

`mage:target` carries the author's string — `entity:cache`, `transition:parse` — and not the IRI of
the thing it annotates. That is the useful join, so withholding it needs a reason, and the reason is
that the IR cannot support it for most target kinds:

| Target kind | Resolvable? |
|---|---|
| `entity:` | yes — `urn:mage:ent:<sys>:<ref>` |
| `model:` | yes — `urn:mage:model:<sys>:<ref>` |
| `relation:` | **no.** Relation ids are excluded from the semantic hash, so relations are not reified — §3 |
| `transition:` | **no.** A transition is addressed by its index within a machine. There is no transition id in the IR for `transition:parse` to name |
| `state:` | yes, since V37 — `<machine>.<state>`, or a bare name exactly one machine declares |
| `parameter:` | **no.** v0.1 does not represent parameters at all (V27 reports it as a reserved future shape) |

Resolving the three that work would leave a dataset where `?q mage:targetEntity ?e` answers for
entities and silently returns nothing for transitions — so a latency query written against it would
report a confident subset. The projection's standing preference is the other way round: silence beats
a confident subset. So no target is resolved, uniformly, and `mage:targetKind` is projected so a
consumer can at least filter by kind without doing string surgery on the raw ref.

**The `state:` row changed, and the record is worth correcting rather than quietly updating.** It
read "nothing fixes how a ref spells the machine," and that was true when it was written. V37 then
fixed it: `stateFault` in `src/validator/rules.ts` resolves a `state:` target and a `when.state` with
the same code, deliberately, because they are the same question. So the reason a `state:` target goes
unresolved is no longer that it *cannot* be — it is the uniformity argument above, which `transition:`
and `relation:` still make unanswerable. `mage:chargedWhile` is resolved because it is a predicate
with one kind in it (§4); `mage:target` is not, because it has six.

What would change this: the IR making relation ids semantic (§3 already names that as the
precondition for anchoring a quantity on a relation), and giving transitions and states addresses a
`target:` ref can name. Both are IR changes, which is the right order — the IR is the semantics.

Two losses happen *upstream*, in canonicalization, and the projection cannot recover them: an
entity's `description` and a domain's `description` are both dropped when the loaded document becomes
IR. They are visible in the YAML and absent from `CanonEntity` and `CanonDomain`. Anyone who wants
them in RDF has to add them to the IR first — which is the right order, since the IR is the
semantics.
