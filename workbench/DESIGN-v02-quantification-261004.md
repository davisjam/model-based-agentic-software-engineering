# DESIGN-v02-quantification-261004 — quantification and selection: what is wired, what is absent, and why aggregation is not the gap

**Scope.** `DESIGN-v02-semantics-261004.md` §5 (`:213-222`) asks v0.2 for eight structural
operations — `elements`, `related`, `reachable`, `path`, `exists`, `all`, `select`, `count` — and
§12 (`:509-519`) asks for quantity operations `value`, `sum`, `min`, `max`, `mean`, `count`. The
Learn guidance wants the first set introduced as question-motivated operations rather than an API
catalogue. This document measures what the engine does today, rules the four decisions the work
needs, and answers the author's open question about whether selection and quantity aggregation are
one mechanism or two.

**Method.** Every claim below carries a `file:line` read with its surroundings, not a grep hit. Three
throwaway probes were run and are reported in §4.3 and §3.1; none was committed. The gates were green
at authoring time: `npm run check` clean, `npm run test` 965 passed / 0 failed / 0 skipped.

**The short version.** The brief that commissioned this document assumed the quantifiers might be
declared-but-unwired, `select` and `count` absent, vacuity and bounded-absence open, and quantity
aggregation unbuilt. Four of those five are wrong, and the direction of the error matters: the
engine is further along than the specification's gap list implies. What remains is smaller and
sharper than "add quantification."

---

## 1. Declared versus wired

### 1.1 `exists` and `forall` are wired end-to-end, in all three dialects

The vocabulary is declared at `src/engine/types.ts:125` (`QUANTIFIERS`) with per-quantifier
evidence semantics at `:129-132` (`QUANTIFIER_EVIDENCE`). The comment there claims two readers. Both
readers exist:

| Claim | Verified at |
|---|---|
| A query carries a quantifier | `src/engine/types.ts:269-271` — all three arms of the `Query` union declare `readonly quantifier: Quantifier` |
| `parseQuery` refuses a missing one, building its prose from the table | `src/engine/types.ts:436-444`; `:441-442` interpolates `QUANTIFIER_EVIDENCE.exists` and `.forall` |
| `check` lists them as alternatives, from the same table | `src/engine/check.ts:161` (the `malformed` arm) and `:236` (the `quantifier-mismatch` arm) |

So the table is a single source with two readers, as advertised. It is not a vocabulary waiting for a
consumer.

Enforcement is then **per dialect**, and each dialect enforces differently:

- **Graph** refuses `forall` outright (`src/engine/graph.ts:464-473`). The sentence says every v0.1
  graph form is existential, so a universal has no reading, and routes the asker to `quantifier:
  exists` or to a behavioural question. Cause: `quantifier-mismatch`.
- **Behavior** pairs each form with its natural quantifier in a table total over `BEHAVIOR_FORMS`
  (`src/engine/behavior.ts:52-59`): five existential forms, `invariant` universal. A mismatch refuses
  and names the right pairing (`:123-133`).
- **Quantity** forces the quantifier from the question's *shape* rather than from a form
  (`src/quant/query.ts:156-169`): a `within:` ceiling query must be `forall`, a bare measurement must
  be `exists`.

Each quantifier produces its own evidence shape, from the closed vocabulary at
`src/ir/types.ts:648-649` (`EvidenceShape`, `EvidenceRole`):

| Dialect | `exists` evidence | `forall` evidence |
|---|---|---|
| graph | `{ shape: "path", role: "witness", nodes }` (`src/engine/graph.ts:372-373`) | — refused |
| behavior | `trace` / `witness` (`src/engine/behavior.ts:223`) or `lasso` (`:64-65`) | `trace` / `counterexample` (`:234-235`) |
| quantity | `trace` / `witness`, or `lasso` / `witness` when unbounded (`src/quant/query.ts:253-255`) | `trace` / `counterexample`, or `lasso` / `counterexample` (`src/quant/requirement.ts:156-159`) |

Evidence reaches the renderer, including its accessible twin: `src/render/accessible.ts:116-137`
branches on `evidence.shape` and `evidence.role`, and `:202` reads `evidence.nodes` for the path
case.

### 1.2 Shipped examples use both — which is the question the brief most wanted answered

Across the four shipped example systems, 26 saved queries declare `quantifier: exists` and two
declare `quantifier: forall`:

- `examples/docable.mage.yaml:278` — `processing-implies-custody`, `kind: behavior`
- `examples/worker-queue/system.mage.yaml:357` — `lease-held-while-processing`, `kind: behavior`

Both universals are behavioural, which is the only dialect that offers a universal. And the
quantity dialect's quantifier handling runs in CI: `test/examples.test.ts:761-773` asks an `exists`
measurement, `:823-829` asks a `forall` ceiling decision, and both assert outcome, coverage,
magnitude and evidence role.

**Conclusion for §1.1–1.2.** `exists` and `forall` are not declared-and-unwired. They are
declared once, read by two refusal surfaces, enforced by three dialect-specific gates, carried by
shipped saved queries, exercised in CI, and rendered. The brief's hypothesis is refuted.

**The asymmetry that is the real finding.** `forall` has no *structural* reading. The guidance's
`all` is therefore not "a quantifier the engine lacks" — it is a graph FORM the engine lacks, behind
a quantifier it already has. That reframing is what makes the work in §5 small.

### 1.3 `select` is not absent — it ships as `elements`

`DESIGN-v02-semantics-261004.md` §5 lists `elements` and `select` as two separate required
operations (`:213-222`) and gives `select(E,P) = {e ∈ E | P(e)}` as the semantics (`:241-243`). The
engine implements exactly that, under the first name:

- `selectElements(system, raw)` — `src/engine/elements.ts:167-203`. Reads the IR entity table,
  filters by declared `type` and by the `PropConstraint` grammar, returns sorted ids.
- Selector parser — `src/engine/elements.ts:69-80`. An unreadable `where` returns `null` rather than
  "no constraints", because reading it as unconstrained would answer with the whole table (`:62-67`).
- Exposed on the agent facade — `ModelQueryApi.elements` at `src/app/agent-api.ts:400`, wired at
  `:872`.
- Registry-grounded — `MODEL_FACADE`'s `elements` row (`src/app/agent-api.ts:351-357`) derives it
  from the structural-graph type's `entity` **subject** with the `property-constraints` selector, not
  from a form. The matching registry declaration is at `src/engine/model-types.ts` under
  `structural-graph`'s `subjects`.

So `select` is shipped. Two things about its shape matter later: it returns a **set**, never an
`Outcome` (`src/engine/elements.ts:118-132`), and it carries **no quantifier** — because a selection
makes no claim, so there is nothing for a witness or a counterexample to establish.

**The one real gap, and it is not in the engine.** Learn derives a type's operation list from
`query.forms` and nothing else (`src/app/learn.ts:69`, `forms: t.query.forms`). `elements` is not a
form, so Learn cannot see it. `MODEL_FACADE` — the table that *does* know about it — has no consumer
outside `src/app/agent-api.ts`. An agent can call `select` today; a student reading Learn cannot
learn it exists.

### 1.4 `count` is absent

Verified absent as an operation. No `count` appears in `src/engine/` or `src/quant/` other than as
local variables (`src/quant/latency.ts:135`, an SCC tally) and in unrelated prose. There is no
`count` form in `GRAPH_FORMS` (`src/engine/types.ts:148-151`), none in `BEHAVIOR_FORMS` (`:155-158`),
none in `REQUIREMENT_METRICS` (`src/quant/requirement.ts:31`), and no facade operation
(`FacadeOperationName`, `src/app/agent-api.ts:298`).

### 1.5 The four operations, re-partitioned

The brief expected "two that extend existing vocabulary and two that are new concepts." The verified
partition is different, and the sizes differ by more than the brief's split suggests:

| Operation | Status | Work remaining |
|---|---|---|
| `exists` | Wired, exercised, rendered | None |
| `select` | Shipped as `elements`; registry-grounded via the subject arm | A Learn surface for non-form operations |
| `count` | Absent | Smallest new thing: cardinality of an existing selection |
| `all` | The quantifier is wired; the **structural form** is refused by name | One new graph form, plus the vacuity disclosure of §3.1 |

---

## 2. The predicate grammar — it covers all four of the guidance's questions

The grammar is `PropConstraint` (`src/engine/types.ts:191-195`: `property` / `op` ∈ `eq|ne|in` /
`values`), parsed by `parsePropConstraints` (`:339-354`), plus `Comparison` (`:198-202`: `left` /
`op` / `right`) for ordered-domain comparison across a relation. `GraphWhere` (`:204-208`) carries
`source`, `target` and `compare`.

The guidance's four Structure questions map onto shipped saved queries in `examples/message-bus/`:

| Guidance question (`learn-1.md` §4, `:94-97`) | Shipped shape |
|---|---|
| Which services depend directly on the database? | `predecessors` — `examples/message-bus/system.mage.yaml:441` |
| Can the public API reach the secrets store? | `reachability` — `:452`; the V7 refusal case |
| Is there a path from an external interface to a privileged service? | `path` over a licensing relation — `:465` |
| Does any restricted event reach a subscriber that is not permitted to process it? | `:479-490` — `form: direct`, `relation: subscribes`, `where.compare: source.permits lt target.carries` |

The fourth is the one the brief flagged as the hard case: a property of one entity compared against a
property of another, across a relation. **It ships, and it is the example's headline question.** It is
well-typed because both properties range over one declared `ordered-enum` domain
(`examples/message-bus/system.mage.yaml:44-48`), which is the V20 discipline.

The comparison is also not confined to `direct`. `endpoints` compiles every `compare` clause into a
`pairOk` predicate (`src/engine/graph.ts:356`) that the evaluator applies on all five endpoint forms
— `direct` (`:584`), `reachability` / `path` / `shortest-path` (`:606`), `all-paths` (`:635`). So the
multi-hop variant of the fourth question works today without any change.

**One extension, named, and it is the smallest one.** `pairOk(src, dst)` binds the two **endpoints**
of a walk. It says nothing about the nodes between them. Over a multi-hop propagation chain,
"restricted data reaches an impermitted subscriber" therefore checks the first and last hop and
ignores an under-permitted intermediate. If a question needs that, the smallest extension is a
**per-hop comparison** — the same `Comparison` shape evaluated at each step of the walk rather than
at the pair — which adds one field to `GraphWhere` and one loop to the evaluator. It adds no
operators, no nesting, no binding forms.

**Ruling: do not build it yet.** No shipped example, saved query or guidance question needs it;
§32's non-goals forbid the general version (`DESIGN-v02-semantics-261004.md:1189-1208`); and the
guidance asks for no generic query-language discussion. It is recorded here so that the day a
question needs it, the answer is a named one-field extension rather than an expression language.

---

## 3. The four rulings

### 3.1 Vacuity — already ruled, already implemented, and the gap is the disclosure *channel*

Classical logic says a universal over an empty set is true, and the brief is right that
"all restricted events are permitted" reading `holds` because there are no restricted events is the
trap. **The engine already rules on it.** `src/quant/requirement.ts:127-149`: when a target selection
matches no execution, a complete walk answers `holds` and a truncated one answers `inconclusive`, and
the comment at `:128-131` names the failure directly — *"a vacuous holds that looks earned is the
failure this suite has shipped once already."*

Probed live on `document-processing` with a selection nothing reaches
(`state: published ∧ retries_exhausted: true ∧ retry_count: 0`):

```
VACUOUS: holds | cov: exhaustive | mag: null
  NOTES: No execution reaches the selected configurations, so the bound holds vacuously —
         there is nothing to charge. If the selection was meant to be reachable, that
         absence is the finding.
```

So the answer is computed correctly and disclosed. **The gap is that the disclosure is prose.** It
travels as a `Compilation` note with `kind: "other"` (`src/quant/query.ts:45`), and the only
structural tell is `magnitude: null` beside `outcome: "holds"`. A renderer that branches on `outcome`
shows a green verdict; nothing in the typed result distinguishes an earned `holds` from a vacuous
one.

**Ruling.** Vacuity resolves to `holds` under exhaustive coverage and `inconclusive` under bounded
coverage — unchanged, because that is sound and already shipped. **The disclosure must become
typed.** The smallest sound change is a `"vacuous"` arm on the existing closed `Compilation.kind`
union (`src/ir/types.ts:675`, today `"history-variable" | "symmetry-reduction" | "other"`). That is
one token in a vocabulary that already exists; it needs no new top-level result field, no schema
reshuffle, and it gives the renderer and the agent facade something to branch on. A fifth `Outcome`
is **not** on the table — the LTL foundation bans one (`DESIGN-v02-ltl-foundation-261004.md:592`),
and a vacuous universal genuinely does hold.

**This ruling binds forward.** Any structural `all` added under §5 inherits it: a universal over an
empty selected set must emit the same typed note. The failure is not that vacuity is unhandled
today — it is that the handling lives in one dialect and is re-derivable rather than reusable.

### 3.2 Bounded absence — ruled in three places; the new work is `count`

`QUANTIFIER_EVIDENCE.exists` says exhaustive absence refutes. Absence under a bound does **not**,
and the engine already holds that line in every dialect:

- **Graph** — `src/engine/graph.ts:620-626`. A truncated search that found no path answers
  `inconclusive` with `bounded(visited, "depth-limit")`. The comment: *"'No path exists' would be
  sound only if the whole graph had been walked."* Default bound: `DEFAULT_MAX_HOPS = 8`
  (`src/engine/graph.ts:52`).
- **Behavior** — `src/engine/behavior.ts:291-311`, the `unsettled` helper. A `state-limit` stop
  answers `inconclusive` under `bounded(..., "state-limit")` with a note saying *"the sound statement
  is 'not within the explored region', never 'not at all'."* Default: `DEFAULT_STATE_LIMIT = 100_000`
  (`src/engine/explore.ts:39`).
- **Quantity** — `src/quant/query.ts:234-247` for a measurement, `src/quant/requirement.ts:132` for a
  ceiling decision. Same discipline, same disclosure.

So there is nothing to rule for `exists` or `all`: the discipline exists, is uniform, and is the same
shape the LTL foundation's §9.6 gate protects.

**There is a new ruling, and it is `count`'s.** A bounded walk makes a count a **lower bound, not a
count**. `select`'s cardinality over the entity table is finite and exact, because the entity table is
finite and fully read (`src/engine/elements.ts:198-201`). A count over configurations is exact only
under exhaustive coverage. A count over **executions** is worse than bounded — see §4.4.

**Ruling.** `count` reports a number only under `Coverage.kind: "exhaustive"`. Under bounded
coverage it reports the figure as a floor and says so in the same typed channel §3.1 adds, or it
reports `inconclusive`. It must not emit a bare integer that a reader will take as exact. This is the
one place where `count` is harder than it looks, and it is the reason `count` is not simply
`ids.length` handed to the caller.

### 3.3 Witnesses — they exist; nothing to add

The guidance's §6 (`learn-1.md:206-214`) wants existential queries to return witnesses visually. The
shape is `Evidence` (`src/ir/types.ts:648-659`) with `role: "witness" | "counterexample"` and
`shape: "trace" | "lasso" | "path" | "none"`. Every existential path in every dialect sets it (§1.1
table), the graph witness carries the node sequence (`src/engine/graph.ts:372-373`), and the
accessible renderer consumes both fields (`src/render/accessible.ts:116-137`, `:202`).

**Ruling: nothing to build.** The witness channel is complete for the three shipped dialects. A new
structural `all` form must emit `role: "counterexample"` on refutation — the behavioural `invariant`
is the pattern to copy (`src/engine/behavior.ts:234-235`), not a new mechanism.

### 3.4 Is `select` a form or a modifier? — the architecture already ruled, and the ruling is "neither"

`select` is a **subject enumeration**, not a form and not a modifier on one. The evidence that this
is already the shipped answer rather than a proposal:

`MODEL_FACADE`'s `elements` row derives from `{ from: "query-subject", noun: "entity", selector:
"property-constraints" }` (`src/app/agent-api.ts:351-357`), and the comment at `:302-308` explains
exactly why the subject arm had to exist — writing the invariant as "maps onto a declared form"
*"would have made the invariant unfalsifiable for exactly the two operations that need it most."*

This keeps the 1:1 type↔`queryKind` discipline intact without an argument, because `elements` is not
a query kind at all. It carries no `quantifier`, produces no `Outcome`, and never reaches
`parseQuery` or the dispatcher (`src/engine/index.ts:96-99`). The three-kind union is untouched.

**Rulings:**

1. `select` is **not** a twentieth form. It stays the shipped subject enumeration.
2. `count` is **not** a twentieth form either. It is the **cardinality of a subject enumeration** —
   the same derivation arm, one step further — subject to §3.2's exactness condition.
3. `all` **is** a new form, and it is the only one of the four that is. It makes a claim, so it needs
   a quantifier, an `Outcome`, and a counterexample; those are precisely the three things that make
   something a form here rather than an enumeration.

That test — *does it make a claim?* — is the line, and it is worth putting on Learn in those words.
`select` and `count` answer "what is there." `exists` and `all` answer "is this true." The first pair
returns data; the second pair returns a verdict with evidence. Students conflating the two is the
same error `QUANTIFIER_EVIDENCE` exists to prevent, one level up.

---

## 4. Does the selection machinery also answer quantity aggregation?

**Answer: the composition case the author's §9 asks for is already shipped and runs in CI — and it
is not `select` plus an aggregate. The two selections range over different domains, and only one of
them feeds aggregation. So the mechanisms are genuinely separate, but in the opposite direction from
the question: aggregation is the part that is done.**

### 4.1 `max{latency(e) | e ⊨ F(success)}` runs today

`QuantityQuery.target` (`src/engine/types.ts:261`) is *"the executions measured are those REACHING
this predicate."* It is compiled during admission (`src/quant/query.ts:174-179`) and threaded into
`maxOverExecutions` (`:231`). The registry declares this as a composition by name:
`executions-selected-by-behaviour`, `with: "state-machine"` (`src/engine/model-types.ts:566-576`),
described as *"the one cross-type composition the kernel implements today."*

In CI, `test/examples.test.ts:761-773`:

```ts
const max = ex.workspace.query({
  kind: "quantity", quantifier: "exists",
  quantity: {
    metric: "latency",
    target: { "document-lifecycle.state": "published", "document-lifecycle.retry_count": 3 },
  },
});
assert.equal(max.outcome, "holds");
assert.equal(max.coverage.kind, "exhaustive");
assert.deepEqual(max.magnitude, { value: maxOracle.expected, dimension: "duration", unit: ... });
assert.equal(max.evidence?.role, "witness");
```

That is `max{latency(e) | e ⊨ F(published ∧ retry_count = 3)}`, with the witness execution attached
and the figure checked against a hand-derived oracle. The test at `:791-793` additionally asserts the
witness *ends* at the selected configuration — *"or the figure is about something else."*

On the LTL correspondence: `target` is a state formula over configurations, and "executions reaching
it" is exactly `F(target)`. The author's `e ⊨ F(success)` and the shipped `target: success` denote the
same set.

### 4.2 "Are all successful executions under two seconds?" also runs today

`learn-1.md` §7 (`:246`) asks this directly. It is `forall` + `within:` + `target:` — all three
fields already admitted together, because the ceiling and the selection are resolved independently
(`src/quant/query.ts:118-151` and `:174-179`) and both reach `evaluatePath` (`:211`, options
`{ limit, target }`).

### 4.3 Probed, because no shipped test combines all three

The CI test for a ceiling decision (`test/examples.test.ts:823-829`) passes `within` with no
`target`, so the three-field combination is implemented but unexercised. Probed directly:

```
TARGETED forall+within: holds {"value":725,"dimension":"duration","unit":"ms"} cov: exhaustive
```

The ceiling query with a behavioural selection decides correctly over the selected executions. That
closes the question: **both** of the author's quantity questions are answerable now.

The probe also recorded the gap worth filing — this combination has no pin. A test asserting
`forall` + `within` + `target` belongs with the §5 Phase 0 work, since it is the shape every later
phase will lean on.

### 4.4 Why this is *not* `select` over executions plus an aggregate

Two independent reasons, both already decided in the shipped design.

**First: the aggregation is derived, not chosen.** `src/quant/query.ts:99-100` derives the dimension
from the metric and the scope from the dimension; the header at `:12-16` states it — *"What a caller
can NOT say is how to aggregate."* `QuantityQuery` has no aggregation field, and the comment at
`src/engine/types.ts:248-257` says the omission is the design. `SEMANTICS.md:735-739` states it
normatively, and the ruling behind it is §29 refinement ① — *"do not make `max|min|named` a
fundamental query operator"* (`DESIGN-quantities-261002.md:75-78`). The enforcement is live: a
configuration-scoped metric with a `target` is refused as `category-error` by name
(`src/quant/query.ts:106-114`), because executions are not an axis that memory aggregates along.

A generic `select`-then-aggregate pipeline would hand the caller exactly the operator choice this
design refuses. It would not extend the architecture; it would reverse it.

**Second: the two selections are over different domains, and only one is finite.** `select`
(`src/engine/elements.ts:198-201`) ranges over the entity table — finite, fully read, exactly
countable. `target` ranges over **executions** — and executions are infinite whenever the machine has
a repeatable cycle. The engine already ships that case: `maxOverExecutions` returns
`kind: "unbounded"` (`src/quant/latency.ts:129`) and the evaluator answers with a **lasso witness and
no magnitude** (`src/quant/query.ts:250-266`), because *"no finite magnitude could stand in for it."*

So `max` over executions is not "aggregate a selected set." It is a longest-path computation over a
condensation that can legitimately answer "unbounded, and here is the cycle." A set-materializing
`select` has no answer to give there.

### 4.5 What *is* genuinely separate — and the author's §7 list is not one feature

`sum, min, max, mean, count` (`learn-1.md:250`) decomposes into four different situations:

| Operation | Status |
|---|---|
| `max` | **Ships.** `maxOverExecutions` over an execution-scoped metric; `peakMemory` over a configuration-scoped one |
| `sum` | **Ships, as the inner step.** `latency` and `cost` sum charges *along* an execution, then maximize *over* executions. It is not a user-facing operator because summing across executions denotes nothing |
| `count` | Absent, and **well-posed only over the finite domains** — entities (exact) or configurations (exact under exhaustive coverage). Over executions it is ill-posed, by §4.4's cycle argument |
| `min`, `mean` | Absent, **and no stated question needs them.** `mean` is worse than absent: a mean over executions requires a measure over the execution set, and there is none — an unbounded set has no mean, and a finite one has no distribution the model declares. Shipping `mean` would publish a number with no denotation |

**What this means for the author's decision.** §7's operation list reads as five peers, and they are
not. Three are already answered (`max` directly, `sum` internally, `value` as the magnitude on every
result), one is well-posed over entities and ill-posed over executions, and one would be unsound. The
better Learn lesson is the one the engine already embodies: **the aggregation follows from what is
being measured.** Latency sums along a path and takes the worst case; memory is evaluated at a
configuration and peaked over the reachable set. That is a sharper version of the §7 typed-semantics
point than `latency + dollars`, because it rules out a *well-typed* operation that still means
nothing — and the engine refuses it by name today (`category-error`, `src/quant/query.ts:106-114`).

**Recommendation to the author.** Do not spend a phase on quantity aggregation operators. Phrase
§7's operations as consequences of scope rather than as a menu, and reuse the shipped
`category-error` refusal as the worked example. The composition in §9 already works; what it lacks
is a Learn surface and one pin, not an implementation.

---

## 5. Phasing

Smallest-sound-first. Each phase is independently landable and each unblocks a named piece of the
Learn page.

**Phase 0 — type the vacuity disclosure, and pin the three-field composition.** Add the `"vacuous"`
arm to `Compilation.kind` (`src/ir/types.ts:675`), emit it from `src/quant/requirement.ts:137-145`
alongside the existing prose, and land the `forall` + `within` + `target` test §4.3 found missing.
First because every later phase inherits the disclosure, and because a reusable channel now is
cheaper than three re-derivations later. *Unblocks:* nothing on Learn directly — it is the
prerequisite that keeps §3.1's trap from reappearing in Phases 1 and 2.

**Phase 1 — `count`, as the cardinality of the existing selection.** Extend `ElementSelection`
(`src/engine/elements.ts:118-132`) with the count, add a `MODEL_FACADE` row deriving from the same
`query-subject` arm, and hold §3.2's exactness ruling. No new form, no new query kind, no quantifier.
*Unblocks:* the `count` half of the guidance's §4 operation list.

**Phase 2 — a Learn surface for operations that are not forms.** `select` and `count` are both
invisible to Learn today because `src/app/learn.ts:69` derives from `query.forms` only and
`MODEL_FACADE` has no consumer outside `src/app/agent-api.ts`. Give Learn a second derivation
source — the facade table, which already carries its registry grounding — so an operation declared
once appears in both places. *Unblocks:* introducing `select` and `count` as question-motivated
operations at all. Without this phase, Phase 1 ships an operation no student can discover.

**Phase 3 — structural `all`, as one new graph form.** The only genuinely new concept of the four.
It needs: a form in `GRAPH_FORMS`, a `NATURAL_QUANTIFIER`-style pairing (it is universal, so
`forall`), a counterexample on refutation per §3.3, the Phase-0 vacuity note over an empty selected
set, and removal of the blanket `forall` refusal at `src/engine/graph.ts:464-473` in favour of a
per-form pairing like `src/engine/behavior.ts:52-59`. *Unblocks:* the guidance's `all services …`
shape (`DESIGN-v02-semantics-261004.md:709-714`) and, more importantly, the §11 queries→requirements
climax, whose polarity discipline reads best when a universal and an existential sit side by side
over the *same* structural model. Today the only universal is behavioural.

**Phase 4 (conditional) — per-hop comparison.** §2's named extension. Build only when a question
needs it.

**Not a phase — quantity aggregation operators.** §4. `max` and `sum` ship, `min`/`mean` are
unmotivated or unsound, and the §9 composition case already runs.

### 5.1 On the brief's Learn-derivation premise

The brief says Learn's content is derived, so a phase needs no separate Learn prose work, and asks
for confirmation or correction. **Half right, and the half that is wrong is the half that matters
here.**

Correct: `src/learn/content.ts:1-21` states the derivation, and `src/app/learn.ts:69` holds
`forms: t.query.forms` **by reference**. A new graph form therefore appears on Learn with no prose
work — so **Phase 3 needs none**.

Incorrect for everything else: `elements` and `count` are not forms, so no amount of registry
discipline surfaces them. That is why the Learn surface is Phase 2 and not a footnote. Also worth
noting from the same header (`src/learn/content.ts:17-20`): section labels and page furniture are
deliberately *not* derived. The restructure the guidance's §16 asks for is prose work regardless of
what the registry can generate.

---

## 6. Where this brief's ground truth was wrong

Checked as directed. Four corrections, two refinements, and one citation set that was right.

1. **"Two of the four already exist as declared vocabulary … establish what is declared versus
   actually wired."** The framing presumes a gap that is not there. `exists` and `forall` are wired
   end-to-end in all three dialects, read by two refusal surfaces, used by shipped saved queries,
   exercised in CI, and rendered (§1.1–1.2). The brief's comment-versus-code suspicion was the right
   instinct applied to the wrong claim: the comment at `src/engine/types.ts:120-123` is accurate.
   The real asymmetry is per-dialect — `forall` has no *structural* reading — which reframes `all`
   from a quantifier gap to a single missing form.

2. **"Then do the same for `select` and `count`: establish they are absent (I believe they are —
   verify)."** `select` is **not** absent. It ships as `elements`
   (`src/engine/elements.ts:167-203`), is exposed on the facade (`src/app/agent-api.ts:400`, `:872`),
   and is registry-grounded via the subject arm (`:351-357`). `count` is absent, as believed.

3. **"The rulings this needs: vacuity … bounded absence."** Both are already ruled and implemented.
   Vacuity at `src/quant/requirement.ts:127-149`, with a comment naming the exact trap the brief
   describes and a disclosure note probed live (§3.1). Bounded absence in three dialects —
   `src/engine/graph.ts:620-626`, `src/engine/behavior.ts:291-311`, `src/quant/query.ts:234-247`.
   What remained to rule was narrower than the brief asked: the disclosure *channel* for vacuity, and
   exactness for `count`.

4. **"Is quantity aggregation a separate feature, or is it `select` over executions plus an
   aggregate?"** The question presupposes aggregation is unbuilt. `max{latency(e) | e ⊨ F(success)}`
   runs in CI (`test/examples.test.ts:761-773`) and the ceiling variant was probed green (§4.3). The
   answer is "separate," but the reason is the reverse of the implied one: aggregation is done, the
   aggregation operator is deliberately *not* a query field (§29 refinement ①), and the two
   selections range over domains that differ in cardinality — executions can be infinite, which a
   set-materializing `select` cannot represent.

5. **Refinement — "the 19 forms are per-dialect (`src/engine/model-types.ts`)."** The count is right
   (10 + 6 + 3) but the citation is downstream. The arrays live at `src/engine/types.ts:148-151`
   (`GRAPH_FORMS`), `:155-158` (`BEHAVIOR_FORMS`) and `src/quant/requirement.ts:31`
   (`REQUIREMENT_METRICS`); `model-types.ts` holds them **by reference** (`:352`, `:435`, `:520`),
   which is the property that keeps Learn from drifting.

6. **Refinement — "Learn's content is derived … so a phase does not require separate Learn prose
   work."** True for forms, false for non-form operations, and `select`/`count` are both non-form.
   See §5.1.

7. **Right, and verified with surroundings:** `src/engine/types.ts:125` (`QUANTIFIERS`), `:129-132`
   (`QUANTIFIER_EVIDENCE`), `:191` (`PropConstraint`), `:198` (`Comparison`), `:339`
   (`parsePropConstraints`), and `src/engine/model-types.ts:531-533` (the three quantity primitives).
   Every one was where the brief said, with the content the brief described.
