# Semantics by model type, and the semantics of combining them (261004)

The commission, verbatim: *"Surface the semantics in much more detail — individual model type and
their combination."*

This is a reference document, written against commit `7cd9e1e0`. It records what the code and the
specification already say; it invents no semantics, and where it finds a gap it names the gap. Every
load-bearing claim carries a `file:line` into this tree. **It does not rule on §G5** — the
composition line is held by the author pending an explicit semantics discussion, and §6–§9 below are
the material that discussion reasons about. This document says what is, flags what is undecided, and
decides nothing.

Two sources of authority, and their division of labor. `SEMANTICS.md` is the normative semantics —
"where a question is about what a model asserts, this file decides it" (`SEMANTICS.md:9`). The
model-type registry (`src/engine/model-types.ts`) is the kernel's own census of what a model can BE:
one typed record per type, consulted by the dispatcher before any evaluator runs
(`src/engine/index.ts:89-90`). This document maps each registry entry onto the spec sections it
instantiates, rather than paraphrasing either.

---

## 1. The per-type semantic record — the skeleton this document follows

`ModelType` (`src/engine/model-types.ts:258-285`) carries, per type: the engineering `question` it
answers, the `queryKind` that interrogates it (1:1, test-pinned — §5 below), `schema` authorities
("pointers, never restatements", `:266`), the `query: QuerySemantics`, the `omits` list (the
purposeful-reduction half of a Learn page, `:269`), a `combineWith` pairing (`:272-276`), the
`presentIn` consultation gate (`:278`), and `wouldLicense` — the authoring move that introduces the
type (`:279-284`).

`QuerySemantics` (`:215-246`) is the semantic core. Every field is one of exactly two things
(`:190-200`): an engine-owned vocabulary **by reference** (`forms`, `composing`, `order.ops` — a
test asserts identity with the source array, so there is no copy to drift), or a **citation** of
where a per-instance fact is declared (`licensedBy`, every `declaredBy`, every `declared` gate — the
registry points; the IR decides). The governing ruling is quoted in the type's own doc comment: the
model type declares *meanings*; the query layer composes *questions*; nothing enumerates permitted
queries (`:189-195`).

The fields, as distinct claims:

- **`forms`** — the question forms, by reference to the engine's own array (`GRAPH_FORMS`,
  `BEHAVIOR_FORMS`, `REQUIREMENT_METRICS`).
- **`composing`** — forms whose answer composes edges or steps and which a per-instance licensing
  declaration therefore gates. Null where the engine owns no such shared set — which the comment is
  careful to say "is not the same claim as 'this type composes nothing'" (`:230-232`). §4.3 below
  unpacks that.
- **`interpretedBy`** — where each form's plain-language meaning is produced, total over `forms` by
  the compiler (`:234-238`).
- **`licensedBy`** — where per-instance licensing is declared (`:239`).
- **`primitives`** — every form classified by `AnswerBasis` (`declared` | `composed` | `aggregated`,
  `:128`) and `PrimitiveGate` (`declared`-with-citation or `by-construction`-with-why, `:115-117`).
  Total over `forms`, "so a new form cannot ship unclassified" (`:241`).
- **`subjects`** — the nouns a question may name, each with a selector grammar and a declaring
  authority (`:94-99`); the noun vocabulary is metamodel-level, closed, and storage-agnostic
  (`:71-82`).
- **`predicates`** — which comparisons mean something, and what scopes them (`:160-167`).
- **`joins`** — "where cross-type composition lives" per the brief; what the kernel actually
  declares there is examined in §6.

`derivedPrimitives` (`:255`) computes the non-`declared` subset rather than storing it — the V18
recompute-never-store discipline applied to the registry itself.

**Three types, not four.** The registry header rules out the sketched "Data / Policy Model" card:
purposes are a second axis living in the app layer, each bound to a kernel type declared here
(`:37-41`; ruling `DECISIONS-RULED-model-types-261002.md`).

---

## 2. `structural-graph` — "What is connected to what?"

### 2.1 What it preserves

The substrate is SEMANTICS.md §3 (`:84`): entities in the single identity namespace (§2, `:50-82`),
typed relations declared per model, and a relation-type vocabulary to which the workbench assigns
**no universal meaning** — `description` and `absence` are for humans; the only machine-readable
semantics are path-composition licensing (V7) and the `symmetric`/`acyclic` properties (V8)
(`SEMANTICS.md:108-153`). The canonical shapes are `CanonModel` (`src/ir/types.ts:102-107`),
`CanonRelation` (`:87-93`), `CanonRelationType` (`:77`); the registry cites exactly these plus the
wire schema and §3 (`model-types.ts:344-350`).

Two structural decisions shape every graph answer. Adjacency is the **union across every model** in
the system — "an architectural invariant about the system is not escapable by declaring the
offending edge in a different model" (`src/engine/graph.ts:8-9`; `ir/types.ts:596-597`) — and V34
(`SEMANTICS.md:926-931`) makes scope a per-question statement at the SPARQL seam rather than a
default. Traversal is BFS, so a witness is the shortest path, "the most legible counterexample a
reader will be shown" (`graph.ts:10-11`).

### 2.2 What its dialect can ask

Ten forms (`GRAPH_FORMS`, `src/engine/types.ts:148-151`): `direct`, `reachability`, `path`,
`shortest-path`, `all-paths`, `predecessors`, `successors`, `cycles`, `components`, `containment`.
`DESIGN-expressiveness-261004.md` §1 classifies them by expressiveness class (one-hop adjacency,
transitive closure, structural detection, tree walk); this document cites that classification rather
than re-deriving it.

The dialect is **existential only**. `forall` on a graph query is refused as a
`quantifier-mismatch`: "the engine implements no universal graph form in v0.1, so quantifier
'forall' has no reading here. Use quantifier: exists, or ask a behavior query"
(`graph.ts:474-482`). This asymmetry matters for §7: a graph answer never carries the universal
column of V22's evidence table.

### 2.3 What licenses each form

The `primitives` classification (`model-types.ts:359-370`) splits the ten forms:

- **`declared` basis, `by-construction` gate** — `direct`, `predecessors`, `successors`: one
  declared edge, or the adjacency read one step; "a declaration, not an inference."
- **`composed` basis, `declared` gate** — `reachability`, `path`, `shortest-path`, `all-paths`,
  `components`: gated per relation type by `composition.path` (V7). The composing set is the
  engine's own `GRAPH_COMPOSING` by reference (`engine/types.ts:184-186`), and V7's enumeration is
  closed and written out in the spec precisely because it was once read as open and the two
  implementations drew different boundaries (`SEMANTICS.md:121-145`). `components` is in the gated
  set although it names no path: "a connected component is a reachability class, which is exactly
  the inference `forbidden` declines to authorize" (`SEMANTICS.md:138-139`).
- **`composed` basis, `by-construction` gate** — `cycles` (licensed by V8's declared `acyclic`
  property, independently of V7) and `containment` (walks the entity `contains` tree of §2, not a
  relation type) (`model-types.ts:368-369`; `SEMANTICS.md:129-137`).

A refused composing question is `outcome: unlicensed`, a **successful** result — "emphatically not
`refuted`: `refuted` would assert that no such ownership chain exists, which is a claim the model
never made" (`graph.ts:13-17`; `SEMANTICS.md:147-148`).

### 2.4 Subjects and predicates

A structural question selects **entities** by property constraints, names a **relation type** by id
(an unnamed type is a typo, not a false answer), and scopes to a **model** by id
(`model-types.ts:371-393`). Equality and membership range over declared entity properties
(`PropertyValue`); order comparisons choose from the engine's `ORDER_OPS` and are well-typed only
when both operands share one declared ordered domain — V20, the rule that makes
`classification > accepts` typecheck (`model-types.ts:394-397`; `SEMANTICS.md:337-348`).

### 2.5 What it omits, and what introduces it

`omits`: behaviour over time and execution cost (`model-types.ts:410-413`) — each the question of
one of the other two types. `presentIn`: `system.models.size > 0` (`:418`). `wouldLicense`: declare
a model under `models:` with its purpose and relations (`:419-421`).

### 2.6 Its join

`appears-in`, with `with: null` — a **within-type** join: "one entity's identity across the
purposeful models that mention it, so an answer in one model can name the element another model
declares," declared by `CanonModel.entities` (`model-types.ts:398-408`; `ir/types.ts:106`). The
`with` field exists because a facade must know whether a join crosses model types or runs between
purposeful models of the same type (`:179-180`).

---

## 3. `state-machine` — "What behaviour can occur over time?"

### 3.1 What it preserves

The substrate is SEMANTICS.md §4 (`:156`): machines with declared states, nondeterministic
transitions ("allowed and required… this is what makes 'may fail' expressible," `:179-181`), guards
that read without synchronizing (`:196-201` — "load-bearing and routinely conflated"), and the
additive tiers T1–T4 of §1: one machine is a plain transition system; a second introduces
interleaving; synchronization exists only where an event is declared; multiplicity gives occupancy,
never binding (`SEMANTICS.md:21-47`, `:260-301`). The canonical shapes are `CanonMachine`
(`ir/types.ts:225-235`) and `CanonTransition` (`:213-223`); the registry cites them plus the wire
schema and §4 (`model-types.ts:428-433`).

**State has a hard boundary** — SEMANTICS.md §5 (`:305`). The boundary separates three categories:
`properties` are immutable descriptive facts, never state (V16); `variables` are the state vector,
every one with a finite domain (V17) — "what makes exhaustive exploration meaningful rather than
aspirational"; `derived` values are recomputed, never stored, never part of state identity (V18)
(`SEMANTICS.md:305-327`). The same boundary excludes quantities from the state vector (§5.2), and
`Configuration` holds it as a type: control states plus variable values and nothing else
(`ir/types.ts:632-637`), with the doc comment naming the stake — one real-valued coordinate makes
the space infinite while `Coverage.kind: "exhaustive"` keeps licensing the strongest claims the
workbench makes (`:625-630`).

**Execution semantics** — SEMANTICS.md §6 (`:753`): a configuration is `(control, values)` over
finite domains; a step is a local transition or a declared-event step whose participants move
atomically; the reachable set is the least set containing the initial configuration and closed under
steps; and the flat exclusions — "There is no fairness, no priority, and no notion of time"
(`:766-768`). A configuration with no enabled step is a dead end, reported, not an error.

### 3.2 What its dialect can ask

Six forms (`BEHAVIOR_FORMS`, `engine/types.ts:155-157`): `reach`, `invariant`, `recurrence`,
`repeatable-cycle`, `deadend`, `transition-live`. Every form has a fixed natural quantifier — all
existential except `invariant` (`NATURAL_QUANTIFIER`, `src/engine/behavior.ts:52-59`) — and a
mismatch is refused with the right pairing named, never reinterpreted (`behavior.ts:123-133`).
Every form takes an `avoid` predicate (`engine/types.ts:243`), so each is really "…while never
passing through a forbidden region" (`DESIGN-expressiveness-261004.md` §1).

The expressiveness envelope, per the design doc's classification (cited, not re-derived): safety
(AG), existential reachability (EF), existential ω-recurrence for a single target set, bounded
precedence via the disclosed history-variable compilation (§7.3, V23), and nothing universal over
infinite behaviours — "safety-plus-reachability only. Fairness is unsupported"
(`SEMANTICS.md:880-883`; `DESIGN-expressiveness-261004.md` §1).

**One denotation per form** — SEMANTICS.md §7.2a (`:847`). `recurrence` means finite re-entry (a
target configuration, ≥1 step, another target configuration); `repeatable-cycle` means a
configuration genuinely repeats — the lasso, the one infinitely-often witness. The worked example:
a retry loop advancing `retry_count` makes `(waiting, 0)…(waiting, 3)` four distinct
configurations, so `recurrence` holds and `repeatable-cycle` is refuted. The earlier design — search
for a true cycle, fall back to re-entry, disclose which — is **forbidden**: "it lets one query mean
two different things depending on what the search happened to find… Each form has exactly one
denotation" (`SEMANTICS.md:855-864`).

### 3.3 Why `composing` is null here

The registry's inline comment states it: "a behavioural question composes CONFIGURATIONS rather
than edges, and the configuration space is the type's own semantics rather than a privilege a
declaration withholds. Every behavioural gate is therefore `by-construction`… and a set here would
be empty" (`model-types.ts:436-440`). The classification agrees: all six primitives are `composed`
basis with `by-construction` gates — "arrival at a configuration satisfying a predicate is what a
state machine MEANS; no declaration withholds it" (`:446-453`). Contrast the graph, where
composition is a per-relation-type privilege, and the quantity, where the gate exists but lives on
the primitive (§4.3).

### 3.4 Subjects and predicates

A behavioural question names a **machine** by id, a **state** only inside a predicate
(`machine.state` — never selected on its own), a **variable** inside a predicate, and a
**transition** by `TransitionSelector` partial match (machine, from, to, sync)
(`model-types.ts:454-477`). Equality and order both range over a variable's enumerated domain
(`:478-481`); V26 makes a guard value outside the domain a finding rather than a dead transition
nobody notices (`SEMANTICS.md:205-216`).

### 3.5 What it omits, and what introduces it

`omits`: execution duration/cost, and topology outside the states it steps
(`model-types.ts:494-497`). At this commit the list does **not** name liveness;
`DESIGN-expressiveness-261004.md` §5 rung 1 records that one-string fix as proposed, and §2 there
documents the legibility gap it closes. That is a known, recorded gap — not a semantic one (the
boundary is real and principled) but a surfacing one. `presentIn`: `machines.size > 0` (`:502`).
`wouldLicense`: declare a machine under `machines:`; "behavioural questions are answered over the
configuration space those declarations span" (`:503-505`).

### 3.6 Its join

`machine-of-entity`, `with: "structural-graph"` — "the binding that lets a behavioural answer name
the structural element whose behaviour it describes," declared by `CanonMachine.entity`
(`model-types.ts:482-492`; `ir/types.ts:227`; V6, `SEMANTICS.md:69-82`). The spec is explicit that
the binding is optional and its absence honest: "a machine is simply an automaton the system
contains — which is the honest description of most behavioral models" (`:79-81`). **So a
graph↔machine relationship exists.** The commissioning brief's first draft claimed it did not; the
brief itself corrects this, and this document confirms the correction from the code.

---

## 4. `quantitative-model` — "What does an execution cost?"

### 4.1 What it preserves

The substrate is SEMANTICS.md §5.2–§5.3: quantities **annotate** the model and are never part of it
— "Quantitative annotations SHALL NOT enter the behavioral state vector merely because their values
are real-valued" (`:386-388`) — a boundary §5.2 calls "the one place where a convenience shortcut
would be unrecoverable" (`:409-413`). Five closed dimensions, each with a derived scope
(`DIMENSIONS`, `ir/types.ts:306-312`): `duration` and `cost` are execution-scoped, `memory`
configuration-scoped, `ratio` and `count` structural. "Scope follows the dimension, and is never
authored" (`SEMANTICS.md:439-451`) — the fact from which aggregation, the metric set, and the
residency requirement are all derived.

The accounting model is **declared, never guessed** (§5.3): a path-aggregated metric with
annotations declares a basis (V35/V36; `AccountingBasis` is a closed set of one, `entities`,
`ir/types.ts:440-447`); a configuration-scoped quantity declares exactly one of `residency:` or
`when:` (V37; `Residency` closed at `resident`, `:497-499`); every reference resolves (V27, V38,
V39). The governing principle: "a quantitative annotation that cannot participate unambiguously in
the accounting semantics of its metric is invalid, rather than silently inert"
(`SEMANTICS.md:541-548`). The registry cites `CanonQuantity`, `CanonAccounting`, `DIMENSIONS`, the
wire schema, and §5.2 (`model-types.ts:512-518`).

### 4.2 What its dialect can ask

Three metrics (`REQUIREMENT_METRICS`, `src/quant/requirement.ts:31`): `latency`, `cost`,
`peak_memory`. A metric names the **analysis**, not a dimension (`ir/types.ts:450-466`). The query
form (`QuantityQuery`, `engine/types.ts:258-266`) has two shapes, told apart by `within`
(`src/quant/query.ts:1-16`; `SEMANTICS.md:710-742`):

- **`within:` + `forall` — decide.** Does every selected execution (or every reachable
  configuration) keep the metric at or under the declared `model:`-targeted ceiling? Answered under
  the V22 discipline verbatim from `requirement.ts`.
- **no `within` + `exists` — measure.** The worst case over the selected executions, or the peak of
  `memory(c)`, established by the witness that attains it, reported as `result.magnitude` with the
  dimension riding on the number (`ir/types.ts:687-691` — "a bare number lets a consumer add
  milliseconds to megabytes, which V30 forbids at the validation layer").

The quantifier is **forced by the question's shape** and a mismatch refused
(`quant/query.ts:153-169`). There is **no aggregation parameter, and that absence is the design**:
aggregation is derived from the dimension's scope, so the rejected `max|min|named` selector "cannot
reappear as a query field" (`engine/types.ts:248-257`; `SEMANTICS.md:735-742`). Asking
`peak_memory` with a `target:` is a **category error, refused by name, never computed**
(`quant/query.ts:104-114`; `RefusalReason` arm `category-error`, `engine/types.ts:68-74`).

### 4.3 The gate lives on the primitive — why `composing: null` does not mean "composes nothing"

This is the subtlest line in the registry, and both the field comment and the entry's inline
comment guard it. `composing` is "null where the engine owns no such set, which is not the same
claim as 'this type composes nothing'. A quantitative metric aggregates charges along a path and IS
gated per instance; the gate simply lives on the primitive (`PrimitiveGate`) rather than in a
shared set, and inventing a parallel array here to fill the field would be the copy this type
forbids" (`model-types.ts:228-232`, restated at `:520-524`).

Concretely: `latency` and `cost` are `aggregated` basis with `declared` gates citing
`ACCOUNTING_BASIS` — "the declared `basis` — what licenses aggregating charges along a path at all
(V35)" — and `peak_memory`'s gate cites `RESIDENCY_DECLARATION` (`:323-331`, `:530-534`). So the
quantity dialect **does** compose (it aggregates along executions a behavioural walk produces), and
that composition **is** per-instance licensed — but by a per-metric declaration each primitive
cites, not by membership in a shared engine-owned set like `GRAPH_COMPOSING`. The three cases line
up as: graph — shared composing set, per-relation-type licence; behaviour — composition is the
type's own semantics, nothing withholds it; quantity — per-primitive gate, per-system accounting
declaration. A test holds the null against the engine's actual ownership
(`test/model-types.test.ts:68-80`: "not 'nothing composes', but 'no shared set to point at'").

### 4.4 Subjects and predicates

A quantitative question names a **quantity** by id, selects **executions** by predicate — and the
subject's own citation names the cross-type fact: "the predicate grammar is the state machine's,
which is what the registered join is for" (`model-types.ts:543-550`) — and names a **ceiling** by
id (`within`, the `model:`-targeted quantity, `:551-557`). Predicates: **no equality arm** — "a
magnitude is decided against a declared ceiling, never matched against a value, and the evaluator
implements no `eq` over quantities. Declaring one would advertise a comparison that refuses"
(`:559-564`) — and the order arm is `declared-ceiling`, scoped by the closed dimension table, not
an operator choice (`:564`; the two-arm design rationale at `:147-158`).

### 4.5 What it omits, and what introduces it

`omits`: "which executions are possible at all — that is the state machine's claim" and "what is
connected to what — that is a structural model's claim" (`model-types.ts:578-581`) — the sharpest
statement in the registry that this type *presupposes* the other two. `presentIn`:
`quantities.size > 0` (`:586`). `wouldLicense`: declare `quantities:` (each with a dimension and a
target) and an `accounting:` basis; "the quantity metrics are computed from those declarations and
from nothing else" (`:587-590`).

### 4.6 Its join

`executions-selected-by-behaviour`, `with: "state-machine"` — "a quantitative question selects the
executions it measures with a behavioural predicate — **the one cross-type composition the kernel
implements today**," declared by `QuantityQuery.target` (`model-types.ts:566-576`). §6 examines
what that sentence does and does not claim.

---

## 5. The 1:1 type↔queryKind pinning

Each type declares exactly one `queryKind`, and "a test pins the 1:1" (`model-types.ts:263-264`).
The test is `test/model-types.test.ts:36-52`: no two types claim one kind, the registry's kinds
equal the **published query schema's own `kind` enum** (read from `mage-query.schema.json`, not
restated), and `modelTypeForQueryKind` round-trips every kind. The function is total over
`Query["kind"]`, with an unreachable throw "for the day someone widens the union without
registering the type" (`model-types.ts:597-612`).

What the pinning buys, as the code states it:

- **Total, unambiguous dispatch.** `runTypedQuery` consults the registry by the query's kind before
  any evaluator runs (`engine/index.ts:81-96`); "a fourth kind cannot land in the wire format
  without landing here first" (`model-types.ts:600-602`).
- **The absent-substrate rung.** `absentSubstrateVerdict` maps kind → type → `presentIn` → refusal
  (`:643-650`). This rung fixed a live defect class: a `latency` question over a quantity-less
  system answered `holds` at 0 ms — "a number that looked measured and was fabricated"; `deadend`
  held, exhaustively, over the one empty configuration of a machineless system (`:12-21`).
- **One capability, described once.** The refusal prose and the Learn entry derive from the same
  registry record, "so the refusal a user reads and the Learn entry they are sent to describe the
  same thing by construction" (`:19-21`).
- **Forms by reference.** The identity tests (`test/model-types.test.ts:54-66`) key each kind's
  forms to the engine array that kind's evaluator actually checks against.

What two dialects on one type would break is the inverse of each bullet, and the registry's shape
makes the question unposable rather than answerable wrongly: `queryKind` is a scalar field, `BY_KIND`
is a `Map` keyed on it (`:594-595`), and the schema-enum parity test fails on any divergence. The
lookup "which substrate does this question interrogate" would stop being a lookup; the
absent-substrate refusal would need a tiebreak nothing declares. This paragraph states what the
structure forecloses, not a design argument for it.

---

## 6. Combination — what the kernel declares, and what it implements

### 6.1 Two surfaces, two jobs

The registry carries two pairing-shaped surfaces, and they are not the same thing.

**`combineWith` is the Learn-facing pairing.** One partner, one richer question, per type
(`model-types.ts:272-276`). Its consumers are pedagogical and presentational: the Learn derivation
(`src/app/learn.ts:60-76`), the Learn page ("Together you can ask…", `src/learn/main.ts:230-231`),
and the inspector's contextual "Possible combinations" line (`src/ui/shell/inspector.ts:211-213`).
The three registered pairings:

- `structural-graph` → `quantitative-model`: *"Can restricted data reach a service, and what does
  carrying it there cost?"* (`:414-417`)
- `state-machine` → `quantitative-model`: *"Can a document reach Published within the declared
  latency ceiling?"* (`:498-501`)
- `quantitative-model` → `state-machine`: *"Which reachable execution attains the worst-case
  latency, and does it stay under the ceiling?"* (`:582-585`)

Tests hold the pairings to partner-is-registered, partner-is-not-self, and
richer-question-is-a-real-question (`test/model-types.test.ts:93-101`), and require a shipped
example declaring both partners (`test/learn-content.test.ts:115-124`).

**`joins` is the semantic composition surface.** `JoinSemantics` (`model-types.ts:176-183`): "a
join is what lets one answer name an element another model declares, and the kernel implements each
one deliberately." Three are declared, and `with` distinguishes cross-type joins from within-type
ones:

| declaring type | join | `with` | declared by |
|---|---|---|---|
| `structural-graph` | `appears-in` | null (within-type) | `CanonModel.entities` (`:398-408`) |
| `state-machine` | `machine-of-entity` | `structural-graph` | `CanonMachine.entity` (`:482-492`) |
| `quantitative-model` | `executions-selected-by-behaviour` | `state-machine` | `QuantityQuery.target` (`:566-576`) |

### 6.2 Binding versus composition — the criterion, from the records themselves

The three joins split two ways, and the kernel's own `meaning` strings draw the line.

**Two are identity bindings.** `appears-in` lets "an answer in one model name the element another
model declares"; `machine-of-entity` "lets a behavioural answer *name* the structural element whose
behaviour it describes." In both, what crosses the boundary is an **identifier**. The binding is
declared data (`CanonModel.entities`; `CanonMachine.entity`), validated as a reference (V3, V6),
and consumed for naming and navigation — selecting an entity highlights its machine and vice versa
(`SEMANTICS.md:78-79`). No evaluator takes one model's *answer* and computes over another model's
substrate through either binding. A graph verdict and a behaviour verdict about the same entity
remain two verdicts; the binding is what lets a reader (or a UI) know they are about the same
thing.

**One is an implemented composition, and it is a selection.** In
`executions-selected-by-behaviour`, a construct from one dialect becomes a **parameter** of a
question in another: `QuantityQuery.target` is a `Predicate` — the state machine's predicate
grammar, as the subject citation says in terms (`model-types.ts:543-550`) — compiled at admission
against the machine's own vocabulary (`quant/query.ts:171-179`) and then *driving the evaluation*:
the executions the worst-case aggregation ranges over are exactly those reaching the predicate
(`engine/types.ts:261-262`; `requirement.ts:45-49`).

The criterion that separates the two, stated descriptively: **a binding contributes identity to an
answer; a composition makes one type's semantics an input to another type's evaluation.** After a
binding, each model still answers its own question; after the composition, the quantitative answer
*depends on* the behavioural substrate — its configuration space, its reachability, its coverage.

And the composition's shape is worth stating as precisely as the kernel does. It is a
**selection** — a behavioural predicate parameterising a quantitative question. It is not a pipe
(no behaviour-query *result* flows into the quantity evaluator; the predicate is evaluated inside
the quantity walk itself), and it is not a relational join over results (no verdict is matched
against another verdict). "The one cross-type composition the kernel implements today"
(`model-types.ts:570`) is one operation, and it takes a predicate as a parameter.

### 6.3 A declared cross-type binding the `joins` census does not list

The accounting layer implements a fourth declared cross-model relationship: the **charge join** of
SEMANTICS.md §5.3. An entity's `executes_in_state` property names the lifecycle state during whose
occupancy the entity runs; a trace step entering that state is an occurrence of the entity, and the
occurrence is what a path-aggregated metric charges (`SEMANTICS.md:590-636`; V38; the spelling is a
kernel constant because two kernel components read it, `ir/types.ts:502-509`). Absent the property,
a state spelling the entity's own id *is* the entity — "MAGE's composition doctrine applied to
accounting" (`SEMANTICS.md:594-595`). The spec's own diagram names the shape:
`behavioral execution --shared identity--> performance component --> duration` (`:583-588`).

By §6.2's criterion this is a binding — identity-shaped, declared, resolved (V38), consumed inside
the quantity evaluation to decide which entity each trace step charges. It binds a **structural**
element to a **behavioural** state in service of a **quantitative** analysis, so it touches all
three types. It does not appear in any type's `joins` array. Whether it belongs there is not this
document's call; the gap between the registry's join census (three) and the kernel's declared
cross-model relationships (this makes a fourth) is recorded here as a fact for the §G5 discussion.

### 6.4 Why quantity is the hub

Three observable facts, no design claim:

- Every registered `combineWith` pairing involves the quantitative model — the other two types each
  pair *with* it, and it pairs back with the state machine (`:414`, `:498`, `:582`).
- It is the only type whose query record carries another dialect's construct as a field
  (`QuantityQuery.target: Predicate | null`, `engine/types.ts:262`) — the other two query types
  reference only their own type's vocabulary.
- Its `omits` list points at both other types by name (`:578-581`): it measures what the machine
  makes possible over the structure the graph declares, and its evaluation literally rides the
  behavioural walk (`quant/latency.ts` via `maxOverExecutions`; `peakMemory` over the reachable
  set) and charges structural entities through the §6.3 join.

### 6.5 What a reader must know before trusting a cross-type answer

All of this is in the result object or its disclosures; none of it is optional reading.

- **The selection is part of the question.** `interpretedAs` carries the selection clause ("…over
  executions reaching …", `quant/query.ts:178`, `:229-230`), and the compiled predicate was
  admitted against the machine's vocabulary before anything ran (`:174-176`).
- **Coverage is the walk's, and it never rounds up.** A truncated walk makes a no-violation ceiling
  answer `inconclusive` — "the sound statement is 'not exceeded within the explored region', never
  'satisfied'" (`requirement.ts:221-241`) — and makes a measurement a weaker claim, disclosed
  (`quant/query.ts:276-280`).
- **A vacuous hold is disclosed.** A selection no execution reaches makes the universal claim hold
  vacuously under a complete walk, with a compilation note saying so — "if the selection was meant
  to be reachable, that absence is the finding" (`requirement.ts:127-149`).
- **The charges came through declared routes only.** The basis (V35/V36), residency/`when` (V37),
  and the charge join (V38 / identity) decide what was counted; an entity a basis charges with no
  counterpart on either route is refused at charge-table time (`SEMANTICS.md:624-627`).
- **Same system, by hash.** Every result names the system it describes (`ir/types.ts:708-713`);
  two answers combine in a reader's head soundly only when their `systemHash` agrees.

### 6.6 What combination is *not*, today

No richer question is a single query. Each `combineWith.richerQuestion` decomposes, today, into two
or more queries — a graph `reachability` plus a quantity measurement; a behaviour `reach` plus a
ceiling decision — whose results a **reader** combines. There is no composed evaluator, no query
form spanning two kinds (`Query` is a disjoint three-arm union, `engine/types.ts:268-271`), and no
defined algebra over outcomes (nothing in the kernel defines what `holds` ∧ `inconclusive` yields,
because nothing composes two verdicts). The one implemented cross-type operation is §6.2's
selection, and it is unidirectional: a behavioural predicate enters a quantitative question. No
graph construct parameterises a behavioural question; no behavioural answer parameterises a graph
question; nothing feeds a verdict into another evaluation. Whether any of that *should* exist is
exactly the held §G5 question, and this document stops at recording that it does not.

---

## 7. The outcome vocabulary across dialects

`Outcome` is four-valued and shared: `holds | refuted | inconclusive | unlicensed`
(`ir/types.ts:666` at this commit), deliberately not boolean — semantically there is "a claim, its
coverage, and its evidence," and mechanically a bare `true`/`false` in YAML is implicit-typed
(`SEMANTICS.md:807-814`; enforced for saved-query expectations by `checkExpectation`,
`engine/index.ts:137-159`). The governing discipline is V22, stated once and shared: settling
evidence (a witness for ∃, a counterexample for ∀) establishes its claim at any coverage; absence
settles only under exhaustive coverage; otherwise `inconclusive` (`SEMANTICS.md:815-836`).

So the **words mean the same thing** in every dialect — each is defined against claim + evidence +
coverage, not against a dialect. What differs per dialect is the **routes** by which each word is
reached, and those routes are worth stating precisely.

**`holds`.** Graph: a witness exists — an edge, a path, a non-empty node set
(`graph.ts:597`, `:626`, `:655`, `:674` et seq.); always existential, since `forall` is refused
(§2.2). Behaviour: a witness for the five existential forms; exhaustive satisfaction for
`invariant`. Quantity, decide-shape: no violation under a **complete** walk
(`requirement.ts:242-249`); quantity, measure-shape: the witness that attains the figure — including
the unbounded case, where `holds` carries a lasso witness and **no magnitude**, "because none would
be true" (`quant/query.ts:250-265`). The quantity dialect is thus the one place `holds` can mean
"the maximum is unbounded."

**`refuted`.** Graph: exhaustively established absence or emptiness (e.g. `graph.ts:604`, `:637`).
Behaviour: exhaustive absence (∃ forms) or a counterexample (invariant) — the counterexample
settling regardless of coverage. Quantity: a violating execution or configuration, settling on its
own evidence however little was walked — and the unbounded maximum **refutes every finite bound**,
with the positive repeatable cycle as the counterexample in lasso shape
(`requirement.ts:7-14`, `:152-174`). In the measure shape, `refuted` means exhaustive absence of
anything to measure — no execution reaches the selection under a complete walk
(`quant/query.ts:234-247`).

**`inconclusive` — reached differently in each dialect, and this is the brief's question answered.**
In a graph answer it arises **only** from hop-bounded truncation: a BFS that hit `maxHops` (default
8, `graph.ts:48`) is a bounded search with `reason: depth-limit`, "never 'no path exists'"
(`graph.ts:100-101`, `:634`, `:660`). In a behaviour answer it arises from state-space truncation:
the walk hit the configuration limit (default 100,000, `explore.ts:39`) with no settling evidence —
and only then; "coverage is `bounded` only when the search was truncated AND no settling evidence
was found, and that is the only case that reads `inconclusive`" (`behavior.ts:17-29`). In a
quantity answer it arises three ways, all downstream of the same truncated walk: a ceiling not
exceeded within the explored region (`requirement.ts:226-240`), a measurement that is only the
worst case *over the explored region* (`quant/query.ts:276-280`), and a selection unreached under
truncation, where "nothing is established either way" (`requirement.ts:142-145`). Same word, same
V22 meaning — a conclusion that would require absence the coverage cannot vouch for — different
generating conditions per dialect.

**`unlicensed`.** One doctrine everywhere: a refusal is a *successful* outcome
(`SEMANTICS.md:147-148`; `engine/types.ts:92-95`), carried as prose plus structured cause
(`Refusal`/`RefusalReason`, `engine/types.ts:36-83`), with §7.6 ruling which of several true
refusals is said. The causes differ by dialect — V7's `composition-forbidden` is graph-only; the
`quantifier-mismatch` arms differ (graph refuses all `forall`; behaviour refuses the unnatural
pairing; quantity forces the quantifier from the question's shape); `category-error` is
quantity-only — but `missing-model-type` sits ahead of all three evaluators identically
(`engine/index.ts:83-90`), and `missing-distinction` (purposeful omission) outranks
`unknown-vocabulary` on both the graph path (`src/engine/omission.ts`) and the quantitative path
(`requirement.ts:269-295`) under the same §7.6 precedence.

---

## 8. Coverage across dialects — who can say "exhaustive", and what makes a bound

`Coverage` is `exhaustive | bounded | not-applicable` with `statesExplored` and a **closed** reason
enum, `"state-limit" | "time-limit" | "depth-limit"` (`ir/types.ts:668-672`). `not-applicable` is
the coverage of every refusal (`engine/types.ts:455`, `graph.ts:773`).

**All three dialects can report `exhaustive`, and each has its own bound.**

- **Graph.** Exhaustive by construction for most forms: the adjacency is a finite set of declared
  edges, fully materialized per query (`graph.ts:74-95`), so `direct`, neighbour reads, `cycles`,
  `components`, and `containment` report exhaustive coverage over it. The one bound is the **hop
  limit** on path searches (default 8): exceeding it is `bounded` with `depth-limit` (§7 above).
  The graph dialect never hits a state limit — there is no state space to walk.
- **Behaviour.** Exhaustive exactly when the reachable set was fully closed under steps within the
  configuration limit; `bounded`/`state-limit` otherwise. Finite domains (V17) make exhaustiveness
  *meaningful*, not automatic: "finite domains do not bound the product usefully: two machines,
  three instances and one `[0,10]` variable already reach millions of configurations"
  (`SEMANTICS.md:837-840`). One refinement the engine documents: when settling evidence is found,
  the walk stops and coverage reads **exhaustive with respect to the question** — "a witness needs
  no further search"; `statesExplored` still reports the truth about the walk
  (`behavior.ts:24-29`).
- **Quantity.** Inherits the behavioural walk's coverage — the aggregation ranges over executions
  the same explorer produced — plus the same evidence-settles refinement: a violation reads
  `exhaustive` with respect to the question (`requirement.ts:160-162`, `:180-182`).

The stake of the flag is stated at the type that guards it: `Coverage.kind: "exhaustive"` "licenses
the strongest claims the workbench makes," which is why quantities are excluded from the
configuration and why V17 refuses unbounded domains (`ir/types.ts:625-630`;
`DESIGN-expressiveness-261004.md` §3).

---

## 9. Where the combination story is thinner than the per-type story

The honest input to the §G5 discussion, recorded as gaps and asymmetries — not as proposals.

- **Per-type semantics are typed, total, and gate-classified; joins are prose plus one citation.**
  A type's `primitives` are total over `forms` by test, each with a basis and a gate; a
  `JoinSemantics` carries a name, a `meaning` string, a partner, and one `declaredBy`
  (`model-types.ts:176-183`). There is no per-join analogue of `AnswerBasis` or `PrimitiveGate` —
  nothing in the record distinguishes a binding from a composition except the prose; §6.2's
  criterion is readable *from* the records but not *encoded in* them.
- **No totality control over joins.** The registry test asserts every join's citation resolves
  (`test/model-types.test.ts:135-150`) but nothing asserts the join census is complete against the
  kernel's declared cross-model relationships — which is how §6.3's charge join can be implemented,
  specified (V38), and absent from the list simultaneously.
- **The richer questions are not evaluable as asked.** §6.6: each decomposes into multiple queries;
  the combining step lives in the reader. No outcome algebra, no cross-kind query form, no composed
  evidence shape.
- **The one composition is unidirectional and single.** Behaviour→quantity selection only. The
  `combineWith` table advertises three pairings; the `joins` table implements one composition.
- **`combineWith` is structurally one-partner.** The field's shape (`:272-276`) holds exactly one
  partner and one richer question per type; whether a type could meaningfully advertise two
  pairings is unposable in the current record.
- **Scope statements do not cross kinds.** V34 makes graph scope explicit per question; a
  quantitative question's behavioural selection has no analogous per-question statement of which
  machines it ranges over (it ranges over the whole compiled system by construction).

None of these is a defect claim. Each is a place where the per-type story has a control or a
denotation and the combination story has prose or absence — which is presumably why the composition
line is held.

---

## 10. Corrections to ground truth, and citation drift found while verifying

- **The brief's first draft claimed no graph↔machine relationship exists.** Wrong, and the brief
  itself corrects it: `machine-of-entity` (`model-types.ts:482-492`) is exactly that relationship —
  an identity binding, declared by `CanonMachine.entity` (`ir/types.ts:227`), validated by V6. This
  document confirms the correction from the code (§3.6).
- **`DESIGN-expressiveness-261004.md`'s line citations into `src/ir/types.ts` have drifted ~9 lines
  at this commit.** It cites `Outcome` at `:657` and `Coverage` at `:659-663`; at `7cd9e1e0` they
  sit at `:666` and `:668-672`. The *content* claims verified correct — the vocabulary is
  four-valued, the reason enum closed. (The commissioning brief inherits the `:657` citation.)
- **The brief's registry line numbers are accurate** at this commit: `QuerySemantics` at `:215`,
  `combineWith` entries at `:414`/`:498`/`:582`, `joins` at `:398`/`:482`/`:566`;
  `ModelType` spans `:258-285` (the brief said ~262-300). SEMANTICS.md section anchors (`:84`,
  `:156`, `:305`, `:753`, `:772`, `:847`, `:996`) all verified.
- **The state-machine `omits` list does not yet name liveness** (`model-types.ts:494-497`).
  `DESIGN-expressiveness-261004.md` §5 rung 1 proposes that one-string fix; at `7cd9e1e0` it is
  recorded, not landed. Sentences in §3.5 above describe the current state.

---

## 11. Volatility — sentences a sibling wave's landing would change

Written against `7cd9e1e0`, with four waves live in adjacent territory:

- **`wb-layer3-semantics` owns `SEMANTICS.md`.** Every `SEMANTICS.md:NNN` citation in this
  document is valid at `7cd9e1e0` and may shift when that wave lands. Section anchors (§3, §4, §5,
  §6, §7.2a, §8) are the stable handles; prefer them when re-verifying.
- **`wb-lifecycle-model` adds a fourth self-model with machines.** At this commit, of the three
  self-models under `models/`, only `example-coverage.mage.yaml` declares machines. Any census of
  self-models, and any statement about which self-models the behavioural `presentIn` gate admits,
  changes when it lands. This document deliberately makes no such census claim beyond this flag.
- **`wb-facade` adds a derived agent vocabulary** (`src/app/agent-api.ts`, `capabilities.ts`).
  §5's "one capability, described once" bullet and §6.1's consumer list (Learn derivation, Learn
  page, inspector) would gain a machine-facing consumer; the registry-as-single-source claim is the
  part that should survive, since deriving from the registry is that wave's stated shape.
- **`wb-mutator-valueflow` owns `models/workbench-components.mage.yaml`.** No sentence here reads
  that file's contents.
