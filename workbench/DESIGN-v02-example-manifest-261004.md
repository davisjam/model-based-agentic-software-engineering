# The example manifest and the semantic coverage gate — §15 and §16 designed

Designs `DESIGN-v02-examples-and-semantic-completion-261004.md` §15 (lines 1527–1561) and §16
(lines 1565–1582). Measured against HEAD on 261004. Every claim carries a `file:line`.

Three labels run through the document. **EXISTS** is a fact about the tree at this commit.
**SPEC** is what §15 or §16 asks for. **RULING** is what this design decides. Where a SPEC and an
EXISTS collide, the ruling says which wins and why.

---

## 1. The question §15 actually poses

§15 reads like a schema to type out. It is not. Its purpose clause is the design:

> *"This allows Learn to be generated from authoritative example metadata rather than duplicating
> prose and semantics."* (line 1561)

Learn is already generated. `src/learn/content.ts:4-28` enumerates five derivation sources and
says of each where the fact comes from; `src/app/learn.ts:1-9` states the property that makes the
page honest — a Learn page rendered from the model-type registry *"cannot describe a capability the
kernel does not gate on."* A manifest is a candidate sixth source, and a sixth source is how a page
gains two ways to say one thing.

So the design question is not *which fields*. It is **what a manifest is allowed to carry, given
that four of §15's fourteen field names already name things in the tree and three more are refused
by shipped decisions.**

Section 2 measures. Section 3 rules on the relation. Section 4 names the three refusals. Sections
5–7 do §16.

---

## 2. §15 field by field, against HEAD

The shipped examples are four, not five: `message-bus`, `transaction-workspace`,
`document-processing`, `worker-queue` (`src/app/examples.ts:76-77`). Each ships two files, a system
and a fixture (`examples/<id>/system.mage.yaml`, `examples/<id>/expected-results.yaml`).

**The fixture is already the manifest, and the code says so.** `src/app/examples.ts:25` calls
`expected-results.yaml` *"the example's own metadata file"*, and explains why the app layer reads it
rather than restating its contents: *"Writing them again here would create a blurb free to drift
from the thing it describes"* (`src/app/examples.ts:15-18`). `src/learn/fixtures.ts:7-10` re-cites
that same decision when it reopens the file for two more blocks.

| §15 field | Status | Where it lives now |
|---|---|---|
| `id` | **EXISTS** | `example:` key, and `SHIPPED_EXAMPLE_IDS` is the sole declaration of the set (`src/app/examples.ts:76-77`) |
| `title` | **EXISTS** | `title:`, read strictly by `readPresentation` (`src/app/examples.ts:131-156`) |
| `engineeringContext` | **NEW** | `summary:` is one sentence of presentation, not an engineering frame |
| `learningObjectives[]` | **NEW** | nothing in the tree names an objective |
| `initialModels[]` | **EXISTS** | `models:` with `id` + `kind`, asserted equal to the system's purposeful models (`test/examples.test.ts:216-225`) |
| `activities[]` | **PARTLY** | `queries:` carries question/models/query-id/expected/evidence. Activity *kind*, *prerequisites* and *concepts exercised* are absent |
| `pinnedProperties[]` | **EXISTS, under another name** | a property IS a saved query plus a recomputed verdict (`src/app/properties.ts:13-33`), and the saved-query set equals the fixture's query set (`test/examples.test.ts:272-277`) |
| `requirements[]` | **EXISTS** | `requirements:` with `statement`, `expressed_as`, `satisfied_when`, `status`; read by `readRequirement` (`src/learn/fixtures.ts:115-132`) |
| `semanticCoverage[]` | **REFUSED** | see §4.1 — derived into `models/example-coverage.mage.yaml`, and the generator refuses self-reports by name |
| `expectedResults[]` | **EXISTS, twice** | `queries[].expected` for every query; `quantitative_expectations:` for the hand-derived arithmetic oracle (`examples/document-processing/expected-results.yaml:119-152`) |
| `mutations[]` | **EXISTS** | `modifications:` with a real transaction and `changes: [{query, from, to}]` (`examples/message-bus/expected-results.yaml:178-197`) |
| `extensions[]` | **PARTLY** | the deliberately-unlicensed question ships as an executable query with a pinned refusal (`examples/message-bus/expected-results.yaml:144-151`). The *model that would license it* is named nowhere |
| `agentActivities[]` | **PARTLY** | agent parity is tested, not declared (`test/examples.test.ts:341,366,446`) |
| `standardsGrounding[]` | **REFUSED** | see §4.3 — derived from the registry's `semanticBasis` (`src/engine/model-types.ts:225`) |

Four fields exist outright. Two exist under other names. Three are partial. Two are new. Two are
refused by decisions already in the tree.

**`expectedResults[]` is the field the brief flagged, and it is the one §15 most under-describes.**
Two shapes ship. Every query carries an `expected:` block with `outcome`, `coverage` and an
`evidence` sub-block that distinguishes an ordered `path` from an unordered `nodes_include`
(`examples/message-bus/expected-results.yaml:9-12`). Document Processing adds a second shape, and it
is richer than §15 asks for: each `quantitative_expectations` entry states the execution it is
about, every premise, the arithmetic, and the number, *"so a disagreement between this file and the
evaluator localizes to one premise rather than to 'the answer is different'"*
(`examples/document-processing/expected-results.yaml:109-113`). That entry also carries
`hand_derived: true`, and `test/examples.test.ts:300-302` asserts the flag on any requirement
decided by one — a hand-derived figure must not read as machine-verified.

---

## 3. RULING — the manifest feeds, by widening one source in place

Three relations were available.

**(A) Subsume.** The manifest becomes the single source and Learn stops reading the registry.
**Rejected.** The registry is what the kernel's query dispatch consults
(`src/app/learn.ts:4-9`); a manifest copy of it can claim a capability the dispatcher does not
have, which is the drift UX-I9 exists to prevent. Subsuming trades a gate for a document.

**(B) Sit beside.** A new per-example `manifest.yaml`, a sixth independent source. **Rejected, and
the precedent is in the tree.** `src/app/learn.ts:25-33` records the one time this project was asked
for a second derivation source and refused: the design's Phase 2 wanted the agent facade's
`MODEL_FACADE` table beside the registry, and the implementation took the fact *one hop closer to
the kernel* instead — *"the same fact one hop closer to the kernel, with no second source to keep in
agreement."* Option B would also duplicate six of fourteen field names on day one.

**(C) Feed, by widening the fixture.** **Adopted.** `expected-results.yaml` is already the
example's metadata file, already read by three consumers, already pinned strictly in CI. §15's new
fields go in it. Learn gains no new reader; `src/learn/fixtures.ts` gains fields.

### 3.1 The admission rule

Option C is only safe with a rule about what may enter. One predicate, and it is the rule
`src/learn/fixtures.ts:26-33` already states for the Learn page, generalised from one consumer to
the file itself:

> **A field belongs in the manifest only if no canonical system declares it and no engine run
> computes it.**

The existing text of that rule, worth quoting because it is the whole argument:

> *"The `queries:` block's per-query `expected` outcomes [are not read here]. The Learn page
> computes those by running the question, which is strictly stronger than quoting them — a page
> that quoted an expected outcome would go on saying `holds` after the engine stopped producing
> it."* (`src/learn/fixtures.ts:28-31`)

Apply the predicate to §15's fourteen and the verdicts in §2's table fall out mechanically.
`learningObjectives[]` passes: no system declares a pedagogical goal and no run computes one.
`semanticCoverage[]` fails the second clause — the generator computes it. `pinnedProperties[]` fails
the first — the system declares the saved queries.

**Two readers, one rule, and they must stay split.** The fixture now has two classes of field: the
ones a derivation reads (title, requirement statements, modification labels) and the ones only an
oracle reads (`expected`, `quantitative_expectations`). The split is what makes reading the file
honest, and the gate below holds it as a declared partition rather than a convention.

### 3.2 Hold the partition the way the repo already holds one

`test/bindings-census.test.ts` faced the same shape — a walk that must be total over a corpus's
authored keys — and solved it by declaring `WALKED` and `DECLINED` together and asserting the pair
total over the keys the documents actually use (`test/bindings-census.test.ts:86-90`). Reuse that
shape rather than inventing a second one:

- a closed key registry over the manifest's top-level and per-activity keys;
- each key declaring which class it is in, `derived-from` or `oracle-only`;
- a test asserting the registry total over the keys the four fixtures author, both directions.

A new key cannot land unclassified, and a classified key no fixture uses fails as a stale
declaration. The same two-direction totality the bindings census gained on 261004
(`test/bindings-census.test.ts:40-43`).

### 3.3 Where the new fields go

Four additions, and nothing else:

```yaml
engineering_context: >          # NEW — the frame §15 wants; `summary` stays presentation
learning_objectives:            # NEW — ordered, each a sentence
  - ...
activities:                     # EXTENDS `queries:` rather than replacing it
  - id: ...                     #   the saved-query id, which is the equality in §7
    kind: query                 #   NEW — closed: prediction | query | modification | design
    concepts: [...]             #   NEW
    after: [...]                #   NEW — prerequisite activity ids, a DAG
extensions:                     # EXTENDS the shipped unlicensed question
  - unlicensed: <query id>      #   the question the kernel refuses today
    licensed_by: <model type>   #   NEW — the model that would license it
```

`activities:` is the rename of `queries:`, not a sibling block. A sibling would re-pose the
equality at `test/examples.test.ts:272-277` as a three-way agreement and give a stale id two places
to hide.

`agentActivities[]` gets **no field.** Agent parity is a property of the facade, tested over every
query already (`test/examples.test.ts:341-365`), and a declared list of "which activities an agent
can do" would be a claim the tests re-derive. If a per-example agent *narrative* is wanted later,
derive it from the parity run.

### 3.4 The file's name is now wrong

`expected-results.yaml` names one of the six blocks it carries. After §15 it names one of ten. A
reader deciding whether a learning objective belongs in "expected results" will decide wrongly.

**Recommend renaming to `manifest.yaml`, as a separate change, after the fields land.** Measured
cost: 23 occurrences across 15 tracked files, of which two are generated and regenerate
(`models/example-coverage.mage.yaml`, and the per-example `system.mage.yaml` comments). Mechanical,
and unreadable if mixed into the diff that adds fields.

---

## 4. The three refusals

§15 asks for three fields that shipped decisions already refuse. Each refusal is reasoned in the
tree, and each reason is stronger than §15's request.

### 4.1 `semanticCoverage[]` — refused, by name

`scripts/gen-example-coverage.ts:13-16`:

> *"Nothing here asks an example to declare which capabilities it covers. A self-report is a claim,
> and a claim can be wrong in exactly the direction that matters: an example that says it exercises
> quantitative reasoning when the product has no quantity construct."*

Every row of `models/example-coverage.mage.yaml` is derived from the loaded IR, the fixture, and a
probe of the published schemas; a capability MAGE has no construct for is reported `unavailable`
with an edge naming the missing construct (`scripts/gen-example-coverage.ts:17-25`). The file
carries its own generated-header warning and `test/examples.test.ts:878-884` regenerates and
compares, so a stale copy fails the build.

§15's own §16 sibling asked for exactly this discipline and got it; adding a declared field now
would re-open it. **Do not add `semanticCoverage[]`.** If §15 wants an example to *state* what it
teaches, that is `learning_objectives:` — a pedagogical claim, which nothing can falsify — not a
capability claim, which the generator falsifies.

### 4.2 `pinnedProperties[]` — the set exists; a verdict must not

A property is *"a STATEMENT plus its current verdict PLUS the grounding of that verdict"*, and the
design decision that governs it is where the second two may live: **nowhere**
(`src/app/properties.ts:15-19`). The reason is sharp and it applies to a manifest field directly:

> *"Put a verdict in the IR and it enters `systemHash`; then recording the answer changes the system
> the answer was about, every property goes stale the moment one is evaluated, and the fixed point
> the hash exists to pin is gone."* (`src/app/properties.ts:29-32`)

The manifest is not the IR, so a fixture's `expected.outcome` escapes that argument — it is an
oracle a test compares against, not a cache a page reads. The distinction is the partition of §3.1,
and it is why `src/learn/fixtures.ts` reads the requirement block and declines the expected block.

So: **no `pinnedProperties[]` field.** The pinned set is the saved-query set, equal in both
directions to the fixture's activity set (`test/examples.test.ts:272-277`), and §16's clause 3 is
already discharged by that equality plus the run at `test/examples.test.ts:231`.

### 4.3 `standardsGrounding[]` — the same document forbids it

§18 of the spec, twenty lines below §15:

> *"The implementation already derives Learn's standards claims from semanticBasis. Preserve that
> architecture."* (line 1645)

`semanticBasis` is a registry field (`src/engine/model-types.ts:225`) carrying §35's
borrowed-or-ours rule per construct, and `src/learn/questions.ts:53-61` records why the standards
section was *omitted* until it existed: *"a page claiming standards grounding while `src/` claimed
none is the capability claim UX-I9 forbids."*

A per-example `standardsGrounding[]` is a second source for that claim, free to name a standard the
registry does not. **Do not add it.** An example's standards grounding is the union of the
`semanticBasis` of the constructs it instantiates, which is derivable today.

---

## 5. §16 — eleven obligations, not ten

§16 lists ten bullets (lines 1571–1580) and closes with a sentence (line 1582). The closing
sentence is an obligation, not a summary: it governs a surface none of the ten reach. Both §16 and
the brief read as ten. **Count it as eleven**; C11 is the one with no enforcement today.

### 5.1 The measured cost

The brief asks whether a gate running every activity of every example is affordable. It is already
running, and here is what it costs.

```
npm run check     3.1 s wall        (tsc --noEmit)
npm run test     15.2 s wall        1130 tests, 0 fail
test/examples.test.ts    687 ms     27 tests, over all four examples
```

Inside that 687 ms:

| test | what it runs | measured |
|---|---|---|
| every supplied query returns the expected outcome, coverage and evidence (`:231`) | all 32 saved queries, through `Workspace.query` | **32.8 ms** |
| every declared modification changes a recorded answer, and discarding changes it back (`:393`) | 7 transactions through `openHypothesis`, each query run before, under, and after discard | **87.4 ms** |

**So §16's two "requires execution" clauses cost 120 ms of a 15.2 s suite — 0.8%.** The corpus is 4
examples, 32 queries, 7 modifications, 8 requirements, 10 purposeful models.

The scaling, which is the part that transfers: roughly **1 ms per query** and **12 ms per
modification** (a modification re-runs its changed queries three times and re-exports the system
twice). Five examples at ten activities and three mutations each lands near 300 ms.

**The brief's premise is measurably false, and the real cost sits elsewhere.** Running an activity
is cheap because the engine is in-process and the systems are small. Authoring the *oracle* is not.
Document Processing's three hand-derived expectations carry their premises, their occurrence counts
and their arithmetic precisely so a disagreement localises
(`examples/document-processing/expected-results.yaml:109-117`), and
`test/examples.test.ts:706` exists to check that the hand arithmetic adds up. That is the expensive
half of §16, and no gate design reduces it.

### 5.2 The ranking

Ranked by what the clause catches, worst failure first. "Held by" is measured at HEAD.

| Rank | Clause | What it catches | Held today | Static or run | Marginal cost |
|---|---|---|---|---|---|
| 1 | **C11** no prose-only question may imply capability the kernel cannot perform | the class the other ten serve: a page that promises what the engine will not do | **partly** — held inside the fixture by set equality (`test/examples.test.ts:272-277`); nothing holds a prose surface, and §17's cards are unbuilt | static, given a typed activity | ~0 |
| 2 | **C9** every promised witness/counterexample is actually obtainable | the vacuous `holds` — a query that returns true because its endpoints never resolved | **yes** — `checkResult` compares shape, ordered `path` and `node_count`; the negative control pins that a one-node path fails (`test/examples.test.ts:246-262`) | **run** | inside C2's 32.8 ms |
| 3 | **C10** every prescribed mutation produces its documented verdict transition | the vacuous safety property — one no modification can break | **yes** — driven through the real hypothesis seam, both directions, plus hash and byte restore (`test/examples.test.ts:393-443`) | **run** | **87.4 ms** |
| 4 | **C2** every claimed expected result is test-pinned | a fixture that looks complete and asserts nothing | **yes** (`test/examples.test.ts:231-243`) | **run** | **32.8 ms** |
| 5 | **C3** every pinned property is evaluated in CI | a saved property nobody checks | **yes, transitively** — the pinned set *is* the saved-query set, by the equality at `:272-277`, and C2 runs it | run (same run) | 0 |
| 6 | **C1** every student-visible executable question maps to a registered query | a question on the page with no engine behind it | **yes, and by equality not membership** (`test/examples.test.ts:272-277`) | static | ~0 |
| 7 | **C4** every requirement references an actual query and valid `satisfied_when` | a requirement claiming satisfaction from a query that refutes it | **yes** (`test/examples.test.ts:290-338`) | static for `expressed_as`; **run** for `decided_by` | inside the quantity run |
| 8 | **C7** every unit is recognized | a silently coerced dimension | **yes, by construction** — V28/V30 refuse an unknown or foreign unit at canonicalize (`src/validator/rules.ts:503-512`, `src/ir/canonicalize.ts:348-366`), and every example must load with zero findings (`test/examples.test.ts:132`) | static (load) | 0 |
| 9 | **C5** every binding references valid elements | a cross-model reference naming nothing, or a reference no binding names | **yes, stronger than asked** — the census derives cross-type references from every tracked `*.mage.yaml` and requires each `(pair, authored key)` to be named by a registered `BindingSemantics`, both directions (`test/bindings-census.test.ts:497`) | static | inside that suite |
| 10 | **C6** every composition is registered | an ad-hoc cross-domain operation | **yes** (`test/bindings-census.test.ts:539`, plus `test/model-types.test.ts:354` — every binding and composition names registered domains, and no name is shared) | static | ~0 |
| 11 | **C8** every LTL formula parses and type-checks | a temporal claim that is prose | **vacuous** — `compileFormula` exists (`src/engine/ltl.ts:520`) and five test files exercise it, but no shipped query carries a formula and the query schema declares no LTL form | static | ~0 when live |

### 5.3 Reading the table

**Nine of eleven are held at HEAD.** §16 asks for a gate that largely exists; what it is missing is
C11 and a live subject for C8. That changes what §16 should be *built* as — not a new test file, but
three additions to `test/examples.test.ts` and one typed field.

**The run/static split is not where it looks.** Four clauses need execution, and two of them (C4's
quantitative arm, C3) ride on runs that already happen. Only C9/C2 and C10 are genuinely new
compute, and they are already paid. Everything else is a set comparison, a schema read, or a
consequence of loading.

**The strongest control in the table is the one §16 did not ask for.** C1 is held by *equality*, not
membership: `assert.deepEqual(declared, [...system.queries.keys()].sort())`
(`test/examples.test.ts:275-277`). Membership would let a saved query go unpresented and an activity
cite a deleted id, one in each direction. Every §16 clause of the form "every X maps to a registered
Y" should be written as an equality for the same reason, and C5's census learned this independently
(`test/bindings-census.test.ts:40-43`).

### 5.4 Two clauses govern substrate that does not exist

**C8 (LTL).** The formula layer landed — `src/engine/ltl.ts`, `ltl-automaton.ts`, `ltl-product.ts`,
`ltl-trace.ts`, 2,068 lines, five test files and a shared evidence helper — and it has **no
verdict path**. The transaction-workspace system says so in its own header: *"The LTL layer landed its formula and
automaton construction with no verdict path, so a query carrying that formula is not answerable"*
(`examples/transaction-workspace/system.mage.yaml:44-46`), and *"No query carries an LTL formula"*
(line 431). `mage-query.schema.json`'s `$defs` are `behaviorQuery`, `evidence`, `graphQuery`, `id`,
`predicate`, `propertyConstraint`, `quantityQuery`, `query`, `result`, `step` — no LTL form.

C8 is therefore a clause with a checker and no subjects. **Land it anyway**, at zero findings: the
enforcement is `compileFormula(scope, text)` over every formula a manifest declares, the set is
empty today, and forward-policing is the value. Landing it later means landing it against a corpus
that already has formulas in it.

**C4 (requirements).** `mage-model.schema.json`'s top-level properties at HEAD are `accounting`,
`domains`, `entities`, `events`, `machines`, `mage`, `models`, `quantities`, `queries`,
`relation-types`, `system`, `views`. There is no `requirements` key. The message-bus fixture states
the consequence and the workaround: *"MAGE v0.1 has NO requirement construct ... A requirement is
therefore carried here, joined to the saved query that decides it"*
(`examples/message-bus/expected-results.yaml:36-41`). C4 is held over the fixture's join, which is
the right place for it today and the wrong place once a sibling's requirement construct lands
(`DESIGN-v02-requirements-261004.md`). Write C4 against the fixture, and note in the test that the
subject moves when the construct arrives.

---

## 6. One gap the ranking exposed

§15 asks each activity to identify *"model(s) required"*. The fixture already has the field, and it
is checked for the weaker of two properties.

`test/examples.test.ts:211` asserts every model a query names is a model the system declares. It
does **not** assert the named set equals the set the query actually depends on. So a cross-model
question could declare one model, grounding in two, and pass — which matters because the declared
set is what §17's card would show a student as "models required", and because EX-I2's
composing-query count reads it (`test/examples.test.ts:205`).

The decider exists. `groundsFor(system, raw, result)` computes the model set a statement depends on
and distinguishes *declares the relation* from *merely contains the endpoint* — the second case
being explicitly *"not a consolation list"* but §12's relevant-models for a refusal
(`src/app/properties.ts:387-413`). Checking `activities[].models` against the *declaring* half of
`groundsFor` is a few lines inside the run at `:231`, so its marginal cost is zero.

**Recommend it as a twelfth clause.** It catches the failure C1 cannot: a question whose engine
backing is real and whose stated prerequisites are wrong.

---

## 7. C11 — what holds "no prose-only question may imply capability the kernel cannot perform"

This is the honesty rule in gate form, and no inspection holds it. Four controls do, and two of
them already ship: the equality of §7.2 is the assertion at `test/examples.test.ts:272-277`, and the
executable refusal of §7.3 is in the Message Bus fixture today. §7.5 names what none of the four
reach.

### 7.1 Make the activity kind a discriminated union, so the omission is a compile error

§15's activity kinds are *prediction / query / modification / design* (line 1558). Declare them as
a closed TypeScript union whose arms differ in what they *require*:

- **`query`** — requires `query: <saved-query id>`. Requires `expected:`.
- **`prediction`** — requires `query:`, because a prediction is scored by running the thing
  predicted. Forbids its own `expected:`; the query's is the answer.
- **`modification`** — requires `transaction:` and `changes: [{query, from, to}]`, the shape
  `modifications:` already has.
- **`design`** — **forbids `query:` and forbids `expected:`.** A design activity is open-ended
  ("Reduce memory use enough to restore a 20% margin. What change would you make?", spec line 64);
  the kernel answers nothing, and the honest encoding says so in the type.

A union makes a `design` activity carrying an `expected:` a type error rather than a review note.
This is the repo's existing move: `src/ui/shell/askbar.ts:26` notes that a `Record` total over the
engine's forms *"fails THIS file to compile until"* a new form is handled, and
`src/engine/model-types.ts:337-340` chose two interfaces over one tagged union *because* a union
*"would have made each optional on the arm that does not use it — which is the shape that lets a
missing field look like a deliberate one."* Same reasoning, opposite conclusion here, and the
difference is that the arms genuinely differ in obligation.

### 7.2 Hold the executable arms by equality, in both directions

Extend the existing assertion (`test/examples.test.ts:272-277`) rather than adding a second:

> the set of `query:` ids over all `kind: query | prediction | modification` activities, and the set
> of `system.queries` keys, must be **equal**.

Membership in one direction lets an activity cite a stale id; membership in the other lets a saved
query ship unpresented. Equality closes both, and it is the assertion already there.

### 7.3 Make the unanswerable question *executable*, which the corpus already does

The sharpest control, and it ships. Message Bus's "You cannot answer yet" question is not prose. It
is a saved query with a pinned refusal:

```yaml
- id: did-analytics-receive-it-at-2-04
  label: Analytics received OrderCreated at 2:04 PM
  expected:
    outcome: unlicensed
    refusal_contains: "is not declared by this system"
    no_evidence: true
```

(`examples/message-bus/expected-results.yaml:144-151`.) Its note records that the refusal *cause*
changed under it — the engine used to report unknown vocabulary and now consults `purpose.omits`
first, so the sentence quotes the declared omission — and that *"the link between a declared
omission and the refusal a user reads is machinery rather than prose"* (lines 158-164).

**RULING: §17's "You cannot answer yet" card must render a refusal the engine produced, never a
sentence an author typed.** A question the kernel cannot answer is honest exactly when the kernel
refuses it on the record and the refusal text is pinned. That converts C11, for the hardest case,
from an inspection into a run — and the run costs one query.

`extensions[].licensed_by` (§3.3) then carries the second half of §17's pairing: which model type
would license the refused question. Check it against the registry's `combineWith` / `presentTypes`
rather than accepting a free string, so the "Add" card cannot name a type the kernel has no card
for.

### 7.4 Declare the furniture, and assert the declaration total

What remains after 7.1–7.3 is free prose: an activity's framing sentence, a section heading, a
card's label. `src/learn/questions.ts:12-15` already draws this line for the upper page — the
declaration *"carries only furniture — an anchor, the engineering question that is the heading, one
framing sentence"* — and `src/learn/content.ts:30-33` states the same split in the negative:
*"What is NOT derived, stated plainly: the section HEADINGS ... Those name page furniture, not
kernel capability."*

Apply it to the example cards, and hold it the way §3.2 holds the key partition: a declared list of
furniture fields, asserted total over the fields the manifest actually authors. A new free-prose
field cannot land undeclared. That is the strongest available form, and it is honest about its
limit — a *declared* framing sentence can still overclaim, and no gate reads English.

### 7.5 The limit, stated so nobody mistakes the gate for a proof

C11 is held mechanically for every question with a *query id slot* — which, after 7.1, is every
question except `kind: design`. For `design` activities the gate's job inverts: it stops them
*claiming* rather than checking their claim. Requiring a `design` activity to name the
`requirements` it must not violate, and resolving those ids against the fixture's requirement
block, is the most a gate can do. The remaining residue is one framing sentence per card, declared
and reviewed.

Measured honestly, that is a narrow residue. The spec's own §1 and §5 question lists show why it
matters anyway: *"Which pinned property changes?"* (line 63) and *"Add a recovery behavior without
violating either the safety or energy requirements"* (line 164) are prose today, for examples that
do not ship, and both would need a query id or a `design` kind before a card could render them.

---

## 8. What the spec and the brief got wrong

Eleven corrections, ordered by consequence.

1. **`semanticCoverage[]` contradicts a shipped, reasoned refusal.** §15 asks an example to declare
   the capabilities it covers; `scripts/gen-example-coverage.ts:13-16` refuses self-reports by name
   and derives every row instead. The spec's own §16 sibling is what established that discipline.

2. **`standardsGrounding[]` contradicts §18 of the same document.** Line 1645 says the
   implementation derives standards claims from `semanticBasis` and to *"preserve that
   architecture."* A per-example field is a second source for a derived claim.

3. **`pinnedProperties[]` is `queries[]` under a third name.** A property is a saved query plus a
   recomputed verdict (`src/app/properties.ts:13-19`); the pinned set is the saved-query set by the
   equality at `test/examples.test.ts:272-277`. A manifest field carrying a *verdict* would be the
   stored-derived-state this project refused twice (`src/app/properties.ts:20-32`).

4. **`expectedResults[]` already exists in two shapes, one richer than §15 asks for.** Per-query
   `expected:` blocks, plus Document Processing's hand-derived arithmetic oracle with premises and
   occurrence counts (`examples/document-processing/expected-results.yaml:119-152`).

5. **§16 has eleven obligations, not ten.** Ten bullets plus a closing rule that governs a surface
   none of the ten reach. The brief inherits the undercount.

6. **The brief's cost premise is false, measured.** "A gate that runs every activity of every
   example is a real cost" — the gate already runs and costs 120 ms of a 15.2 s suite, 0.8%. The
   expensive half of §16 is authoring the oracle, not executing it.

7. **§16 clause 8 is vacuous and §16 does not say so.** LTL formula and automaton construction
   shipped with no verdict path (`examples/transaction-workspace/system.mage.yaml:44-46`); no query
   carries a formula; `mage-query.schema.json` declares no LTL form.

8. **§16 clause 4 presumes a requirement construct that does not exist at HEAD.**
   `mage-model.schema.json` has no `requirements` key. Requirements live in fixtures, joined to the
   query that decides them (`examples/message-bus/expected-results.yaml:36-41`).

9. **§15 and §17 say five examples; four ship, and the membership disagrees.** The spec's five
   (lines 218-222) include an Embedded Sensor Node and an Autonomous Delivery System that do not
   exist, and omit Worker Queue, which does. `src/app/examples.ts:73-74` already flags the
   unadjudicated half: *"§31 drops Worker Queue from its three while §18 keeps it, and nothing in
   this wave adjudicated that. Four ship."* A manifest schema for five examples has four subjects.

10. **§15's consumer does not exist.** §17 line 1603 says *"The lower Learn page is driven by the
    five example manifests."* The Learn page mounts type sections, use sections and seven question
    sections (`src/learn/questions.ts:135-299`); there is no per-example card, and no code anywhere
    names "You can answer now", "Try changing", "You cannot answer yet" or "Open workspace". §16
    would govern fields no page reads. That is an argument for landing §16's clauses against the
    *fixture* now and the cards later, not for deferring either.

11. **A stale comment found on the way through, unrelated to §15.**
    `models/workbench-components.mage.yaml:137-139` says of the `depends-on` absence clause:
    *"Nothing yet derives `src/`'s imports and checks them against this edge set, so today the
    absence binds a reader and an agent, not a build."* `test/import-graph.test.ts:363` does exactly
    that — *"every import in src/ is an edge the components model declares, and every declared edge
    exists"* — and `src/app/learn.ts:38-42` relies on the gate, citing a measured run of it. One
    sentence to delete; filed here because this document's premises were checked against it.

**A note on the brief's own ground truth, since it asked.** The brief named
`src/app/examples.ts`, `models/example-coverage.mage.yaml`, `test/examples.test.ts` and the
fixtures. The two files that most changed this design's answer were not on the list:
`src/learn/fixtures.ts`, which establishes that reading the fixture is already a sanctioned Learn
derivation source and states the admission rule §3.1 generalises, and
`scripts/gen-example-coverage.ts`, whose header refuses `semanticCoverage[]` outright.

---

## 9. Implementation order

Nothing here needs a new file.

1. **The key registry and its totality test** (§3.2). Lands at zero findings over the four fixtures;
   every later step adds a classified key.
2. **The activity union** (§7.1) and the rename of `queries:` to `activities:` with `kind:`,
   `concepts:`, `after:`. Mechanical over four fixtures.
3. **The equality extension** (§7.2) and the `groundsFor` check (§6), both inside the run at
   `test/examples.test.ts:231`.
4. **C8 at zero findings** (§5.4) — `compileFormula` over every declared formula, empty set today.
5. **`extensions[].licensed_by`** (§3.3, §7.3), checked against the registry.
6. **`engineering_context:` and `learning_objectives:`** — the two genuinely new prose fields, which
   nothing can falsify and which therefore need no gate beyond the key registry.
7. **The furniture declaration** (§7.4), when §17's cards land and there is furniture to declare.
8. **The rename to `manifest.yaml`** (§3.4), separately, last.

Steps 1–6 are gate and schema work over the existing corpus and do not wait on §17. Step 7 waits on
the cards. Nothing waits on the requirement construct or on LTL; C4 and C8 are written against what
ships and move when the substrate does.

---

## 10. Open questions for the author

**Q1. Does `learning_objectives:` earn its place, given that nothing can falsify it?** Every other
field in the manifest is checkable. An objective is a pedagogical claim, and the repo's standing
posture is that an unfalsifiable declaration drifts. The counter-argument is that §17's cards need a
reason to exist beyond the questions they list. *Recommendation: include it, declared as
`oracle-only`'s third class — `pedagogy` — so the key registry records that no gate reads it.*

**Q2. Is the five-example membership to be adjudicated now?** §9 of this document records the
disagreement; `src/app/examples.ts:73-74` records that nothing has resolved it. A manifest schema
does not depend on the answer, but §17's card count does.

**Q3. Should `kind: prediction` ship at all before §17's cards?** A prediction activity is
meaningless without a surface that asks the student first. It could land as a declared-but-unused
arm, or wait. *Recommendation: land the arm, because adding a union member later is the change that
breaks every total switch over it, and landing it now makes that break happen once, here.*
