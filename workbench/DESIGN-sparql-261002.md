# Phase J layer 2 — SPARQL as an interface: design

Layer 1 landed (`c21c46e0`): the typed IR projects to an RDF dataset, one named graph per purposeful
model, entity identity shared across them. Layer 2 puts a SPARQL 1.1 subset over that dataset.

The governing ruling is D3 — **dual implementation under one semantics. SPARQL is an interface, not
the semantic foundation.** Everything below follows from taking that literally.

---

## 1. The constraint that shapes the whole layer

D3's measurement: of ten query outcomes, SPARQL can express nine, and roughly **half the witnesses**.
The cause is specific and not worked around — SPARQL 1.1 dropped path variables, so `mage:rel+`
*proves existence without binding the intermediates*. You cannot ask it which nodes it went through.

That collides with a contract already fixed: **evidence travels with every answer.** A `QueryResult`
is a claim plus coverage plus evidence, and `evidence: null` already means "none applicable" — so an
outcome-only answer is a weaker object than the type can represent. SPARQL cannot be the foundation
without weakening that contract for every question, which is precisely why D3 ruled it an interface.

The split that follows:

| Question shape | Answer path | Why |
|---|---|---|
| Relational, where a binding set **is** the evidence (`SELECT ?service WHERE …`) | SPARQL | The rows are the witness. Nothing is lost. |
| Existence needing a **path** witness (`reachability`, `shortest-path`, `all-paths`) | engine | SPARQL proves existence without binding intermediates. |
| Behavioral (traces, lassos, state-space coverage) | engine | Not expressible at all; the dataset holds structure, not executions. |

A SPARQL result therefore carries `evidence` built from its own bindings, or it carries
`evidence: null` **with coverage saying so** — never a fabricated path.

## 2. The three things SPARQL structurally cannot hold

D3 named these, and layer 1 already decided two of them. Recording which, because "pick one, once"
only works if the pick is written down.

**V7 licensing — the evaluator must be gated, and the gate reads the IR.** Nothing in RDF knows about
`pathComposition: forbidden`. A raw endpoint over the projection will cheerfully evaluate `mage:owns+`,
and the workbench's most distinctive behaviour — refusing a question the model does not license —
silently disappears. Layer 1 helps by projecting `pathComposition` as a fact, and by having derived
`canTransitionTo` declare itself `forbidden` in the same vocabulary. But **the authority stays the
IR**: the gate runs before evaluation, not as a `FILTER` the query author could omit. A licensing
check a caller can forget is not a control.

**V8 symmetry — picked, on the query-builder side.** Layer 1 materializes **no** inverse term:
`contains` has no `containedBy`, and the reasoning is in `vocabulary.ts` — SPARQL traverses backwards
with `^` already, and a materialized inverse doubles the dataset while making the projection a place
where facts get invented. So the builder must emit `(mage:rel|^mage:rel)` for a type declared
symmetric. Layer 2 owns that, and it must read `symmetric` from the IR rather than guessing from the
vocabulary.

**Cross-model union — a named-graph decision, and it must be deliberate.** The engine's adjacency
unions across every model, so an architectural claim cannot escape by moving an edge to a different
model. In RDF that is exactly the default-graph-versus-`GRAPH` choice: a default-graph query unions,
a `GRAPH`-scoped one does not. Layer 1 put system-level facts (existence, type, properties,
containment, relation-type declarations) in the default graph and each model's relations in its named
graph — so the union is available but not automatic. **A query that must not be escapable queries the
union; a query about one purposeful reduction scopes to its graph.** Choosing wrong is a silent wrong
answer, so the builder must make the scope explicit per query rather than defaulting.

## 3. Enforcing the subset at the MAGE boundary

Supported (§11.1): `SELECT`, `ASK`, basic graph patterns, named graphs, `FILTER`, comparison,
property paths, `OPTIONAL`, `COUNT`/`MIN`/`MAX`/`SUM`, `GROUP BY`, `ORDER BY`, `LIMIT`. **No
extensions in v0.1 — every accepted query stays valid SPARQL.**

The subset is enforced *at MAGE's validation boundary, not by reimplementing the language*. So: parse
the query, walk it, reject anything outside the subset with a finding naming the construct — then
hand the unmodified text to the engine. Never rewrite a user's query to make it fit; a silently
rewritten query answers a different question.

## 4. Structured not-answerable

A refusal must be a structured object, not a sentence. The existing `QueryResult` already has the
shape: `outcome: "unlicensed"` plus `refusal`. What layer 2 adds is the discipline that a refusal
**names what is missing and what would license the question** — a refusal that only declines is a
dead end, while one that says what to model is a direction.

Three refusal causes this layer introduces, each distinguishable:

- **unlicensed by the model** — path composition forbidden on this relation type (V7). What would
  license it: declaring composition allowed, which is a semantic claim the author must own.
- **outside the supported subset** — the query uses a construct v0.1 does not accept. Names the
  construct.
- **not expressible as a relational query** — the question is behavioral. Routes to the engine rather
  than refusing, and says so.

The first and third are semantically different in a way worth keeping separate: one means *the model
declines to answer*, the other means *ask the other interface*. Collapsing them would teach a user
that a licensing refusal is a tooling limitation.

## 5. Q6 from the quantities design, now answerable

`DESIGN-quantities-261002.md` Q6 asked whether quantities project to RDF, noting that flattening one
to a bare literal loses its dimension — at which point SPARQL can add milliseconds to megabytes,
which §7 forbids at the validation layer.

Layer 1 shows the resolution: it already projects a relation type's own properties as facts
(`mage:pathComposition`, `mage:symmetric`) rather than flattening them away. **Quantities project the
same way — as structured resources carrying target, dimension, and value.** It costs query
ergonomics, and it keeps the dimension where a `FILTER` can see it. The alternative trades a
correctness property for convenience, and this project does not make that trade.

---

## 6. Open questions

### Q7 — Can Comunica ship on a static Pages site at all?

This is empirical and it gates the whole layer. Comunica is a large bundle; the site is static, with
no server and a strict offline-capable posture. The z3-on-Pages investigation already found a hard
blocker of exactly this kind — Pages cannot set the COOP/COEP headers `SharedArrayBuffer` requires —
so "a standard library exists" has already proved insufficient once here.

**Measure before building.** Bundle a trivial Comunica query, check the gzipped size and cold-start
time, and confirm it needs no header the site cannot set. A negative result is cheap and useful; the
fallback is a hand-written evaluator over the subset, which is a real option precisely because the
subset is small.

### Q8 — Worker or main thread?

The analysis Worker already exists for long explorations. A SPARQL query over a small dataset is
fast, but property paths over a large one are not bounded in any obvious way. Reusing the Worker
costs an async boundary the services facade deliberately avoided for the synchronous engine.

**Ruled (261002, WB-EVAL): main thread, synchronous, with an explicit step budget.** The evaluator
(`src/sparql/eval.ts`) counts every quad matched, path step expanded, and join pair produced
against a budget; exceeding it returns a fourth result arm, `exhausted`, naming the budget and
routing the caller to the Worker. An unbounded synchronous evaluator was not a candidate — the
brief and this section both rule it out — so the decision was between paying the async boundary on
every query and bounding the synchronous path. The measurements say the common case never needed
the boundary:

- `ASK { GRAPH <g> { e0 p+ e999 } }`, 1,000-entity chain: **2.4 ms** median (Comunica, same scale
  point, §4: 50–80 ms).
- Same query over a 5,000-entity chain: **9.2 ms** (Comunica: 188–214 ms). ≤16,384 steps.
- `(p|^p)*` — V8's symmetry encoding, closed — across the 5,000-entity chain: **11.5 ms**.
- The pathological shape, `?x p* ?y` with both ends free over a 500-entity chain: **154 ms**,
  125,250 rows, ≤262,144 steps. This is the shape that motivates the budget; no worked example
  asks it.

(M3 Pro, Node 24, median of 5; step counts are powers-of-two upper bounds from a doubling probe.)
A step costs 0.6–1.2 µs, so the default budget of 500,000 steps bounds the worst case near
0.3–0.6 s and admits every measured query with at least 2× headroom. The projection of a worked
example is two orders of magnitude smaller than these chains, so typical evaluation sits in
single-digit milliseconds — the Worker's cold-start and messaging cost would exceed the query.

Second-order consequences, stated so they are decisions rather than discoveries: the budget is a
**work** bound, not a wall-clock bound, so a slower machine stretches the seconds but nothing
stalls unboundedly; `exhausted` is distinguishable from both an empty result and a refusal, so a
caller cannot read "too big for here" as "no" (the Comunica lesson applied to ourselves); and
wiring `exhausted` to an actual Worker dispatch is deliberately NOT built here — the Worker
protocol is another unit's surface this wave, and the routing arm gives it a stable thing to catch
when it lands.

### Q9 — Is "run arbitrary SPARQL" a capability, and does UX-I1 apply to it?

This is the interesting one, and it is a real question rather than a detail.

§11 says *students normally need not write SPARQL* — an agent translates the natural-language question
into it. So the likely shape is: agents issue SPARQL, humans click a suggested question. But UX-I1
requires every **semantic capability** be reachable from both interfaces, and if an agent can run
arbitrary SPARQL while a human cannot, that is either a violation or evidence that arbitrary SPARQL is
not a semantic capability.

Three readings:

1. **`query` is the capability; SPARQL is a syntax for it.** The human affordance is the suggested-
   question list, the machine affordance is SPARQL, and both reach the same service. UX-I1 is
   satisfied and nothing is owed. This is the cleanest reading and probably correct — the registry
   already treats `query` as one capability with two affordances.
2. **Arbitrary SPARQL is its own capability** and needs a human console to satisfy parity.
3. **Register it with the human affordance absent** and let UX-I1 report the gap honestly, as the
   registry already does for ten others.

Reading 1 is recommended, but it has a consequence worth stating: it means the **suggested-question
set bounds what a human can ask**, while an agent is unbounded. That asymmetry is defensible — it is
the same reason the UI has no raw YAML editor — but it should be a decision, not something discovered
later when someone notices a human cannot ask a question an agent answered.

---

## 7. The text path, as built (261002, WB-SPARQLJS)

`eval.ts` evaluated the algebra and nothing could ask it a question. `src/sparql/parse.ts` closes
that: `sparqljs` 3.7.4 parses the text, a walk maps the parse onto `algebra.ts`, and `answerSparql`
is the whole interface — text in, solutions or a structured refusal out.

**`algebra.ts` did not move.** It was designed as what a `sparqljs` parse naturally produces, and
that held: every node renamed rather than restructured, and no arm was missing. `path-negated`
holding forward predicates only, `unsupported` as a first-class node, `from` as a bare IRI list —
each matched what the parser emits. Nothing in this unit wanted to change it.

### 7.1 The scope mapping

Scope is quad VISIBILITY, and **it has no default: the caller states it (V34). On the text path the
caller's statement is the query's own graph form.** Every arm below is a derivation from the text,
not a choice made on the author's behalf.

| Query form | Derived scope | Why it is forced, not picked |
|---|---|---|
| `GRAPH ?g { … }` | `system-union` | The clause ranges over every visible named graph. A model scope would silently shrink the range the author wrote. |
| `GRAPH <g>`, one model's graph | `model: g` | §2's "a query about one purposeful reduction scopes to its graph", read literally. |
| `GRAPH <g1>` + `GRAPH <g2>`, two models | `system-union` | No model scope makes both graphs visible. Widening cannot add a solution, because every pattern is still restricted to a graph the author named. |
| `FROM <g>`, one model's graph | `model: g` | The clause promotes that graph to the default graph; the scope keeps it visible. |
| `FROM <g1> FROM <g2>` | `system-union` | Required. `applyFrom` merges the listed graphs out of `view.named`, so a model scope would hide one and drop its quads without a word. |
| bare `WHERE`, no `FROM`, no `GRAPH` | **refused** | The text states no scope. |
| `FROM` together with any `GRAPH` clause | **refused** | With no `FROM NAMED` the dataset clause leaves no named graphs (§13.2), so the `GRAPH` clause matches nothing. The query is guaranteed empty. |
| a relation type in a default-graph pattern, no `FROM` | **refused** | The default graph holds no relation edge, so that triple matches nothing and empties the join. |
| a graph IRI no declared model owns | **refused**, `unknown-vocabulary` | Same cause `admit`'s own `checkScope` reports, so one mistake gets one word. |

The last three are the controls that matter, and they exist because **`system-union` is not the
default graph.** A front end that mapped a bare `WHERE` onto either scope would answer every
architectural question with a confident empty set and look like it worked. The bare-`WHERE` refusal
catches the whole-query form; the stranded-relation refusal catches the same fault in a query that
scoped itself correctly and then left one triple outside the block.

**The cost of refusing a bare `WHERE`, stated rather than discovered.** A question about the default
graph alone — an entity's type, a property value, a relation type's own declarations, the `contains`
tree — has no spelling the text path accepts, because `FROM` replaces the default graph and `GRAPH`
cannot see it. One consequence is concrete: **the gate's `containment` arm is unreachable from
text.** Containment lives in the default graph, so no accepted query reads it. Closing that gap
needs a way for a caller to state a default-graph scope, which is a decision about `QueryScope` and
therefore not this unit's to make.

### 7.2 `GRAPH ?g` unions solutions; only a dataset clause merges the graphs

This was measured while wiring the text path, and it **contradicts prose in `project.ts` and
`licensing.ts`.** Both call an unscoped `GRAPH ?g { … }` the cross-model union. It is the union of
per-graph EVALUATIONS: `?g` binds one graph per solution, so neither a property path nor a BGP join
crosses a graph boundary inside it.

Over two models holding `a -calls-> b` and `b -calls-> c` [measured]:

| Query | Result |
|---|---|
| `GRAPH ?g { ent:a rt:calls+ ?x }` | `[b]` — the closure stops at the graph boundary |
| `FROM <one> FROM <two> { ent:a rt:calls+ ?x }` | `[b, c]` — the chain crosses models |
| `GRAPH ?g { ent:a rt:calls ?m . ?m rt:calls ?x }` | `[]` — no single model holds both hops |
| `FROM <one> FROM <two> { ent:a rt:calls ?m . ?m rt:calls ?x }` | `[c]` |

That matters because §2 justifies the union scope by **escapability** — "an architectural claim asked
this way cannot be escaped by moving the offending edge into a different model." Under `GRAPH ?g`,
moving an edge to another model does break the chain, silently. So escapability is a property of the
query SHAPE, not of the scope: it needs a dataset clause listing every model's graph, which is the
only form that merges them. `QueryScope` governs visibility and never promised more; the two were
conflated in the prose.

The translator does not refuse a closure under `GRAPH ?g` — it is valid SPARQL, and "within any one
model, does a reach b?" is a real question. `test/sparql-parse.test.ts` pins the distinction so it
cannot rot back into a guess. **A query builder emitting an escapability claim must emit the dataset
clause, not `GRAPH ?g`**, and that belongs to whichever unit owns the builder.

### 7.3 Enforcing the subset

§3's rule is kept exactly: parse, walk, refuse by name, never rewrite. Two routes, chosen by whether
the algebra can hold the construct losslessly.

- **It has a node** — `UNION`, `MINUS`, `BIND`, `VALUES`, `SERVICE`, sub-`SELECT`, a `?` path, a
  negated set over an inverse, any `FILTER` operator outside the subset. The translation emits the
  algebra's `unsupported` / `path-unsupported` / `expression-unsupported` arm CARRYING the
  construct's name, and the walk's `SubsetVerdict` refuses. The algebra stays lossless, which is what
  `algebra.ts` asks for, and `eval.ts`'s own `assertSupported` catches the same node as a second line.
- **It has no node** — `DISTINCT`, `REDUCED`, `OFFSET`, `HAVING`, `SELECT *`, an expression in
  `SELECT`, an `ORDER BY` expression, `AVG`, `COUNT(DISTINCT …)`, `FROM NAMED`, `CONSTRUCT`,
  `DESCRIBE`, Update, a blank node, a language-tagged literal. These refuse on the spot, because the
  only way to build an algebra would be to drop the clause — and dropping a clause is the rewrite §3
  forbids.

Both end in `outsideSubset` from the landed vocabulary. No new refusal cause was minted. A syntax
error becomes the same cause with the parser's message as its detail: the vocabulary is closed on
purpose, and `outside-supported-subset` is the closest of the three.

An unrecognized node refuses rather than being skipped, and the walker earns every field it reads —
which is why `sparqljs.d.ts` declares `parse` as returning `unknown` instead of taking
`@types/sparqljs`. A closed union of parse nodes would teach the compiler that an unrecognized node
is impossible, the refusing branch would look like dead code, and the next reader would delete it.
That branch is the whole defence against §6's defect class.

**Refusal order: clause, then query, then model.** A clause the subset rejects comes first, in the
order the clauses are read; then the query-level form; then whatever `admit` decides. §4 gives the
reason — a query the subset does not accept was never a well-formed question of this model, so
answering it with a modeling critique misdirects the author. One cost is recorded rather than hidden:
a misspelled relation type sits inside `admit`, so it is reported after a bad clause, inverting the
gate's internal ordering for that one pair.

### 7.4 Licensing, and what the gate reads off the text

The gate is the only door. `admit` is the sole producer of `LicensedQuestion`, `evaluate` demands
one, so no path reaches evaluation without licensing. The translator derives the gate's inputs:

- **Relation types** — every one the query traverses, read from predicate IRIs through the `rt:`
  namespace. Each is admitted, and ALL must be licensed, so a licensed type cannot carry an
  unlicensed one into evaluation beside it.
- **Traversal** — `licensing.ts`'s definition, not hop arithmetic. `rel+` and `rel*` compose; so does
  a `/` sequence mentioning one type twice, and so does a BGP join whose triples chain object to
  subject. A gate that only looked for `+` would let `{ ?a owns ?b . ?b owns ?c }` smuggle a
  reachability claim past `composition.path: forbidden`. Over-approximating is the safe direction.
- **A variable predicate** names no relation type, and SPARQL forbids a path operator over one, so
  its traversal is necessarily `direct` — which every type licenses. The gate is still consulted for
  each declared type: a query that names nothing does not thereby escape V7.
- **A negated property set** traverses the types it does not name. Harmless at one hop; under a
  closure it is reachability over types that never consented, so it raises every declared type to
  `composing` and the gate decides each one.
- **Evidence** is always `bindings`. SPARQL 1.1 has no path variables, so no text query can ask for a
  path witness — a `SELECT`'s rows ARE its evidence. The `routed` arm is therefore unreachable from
  text, and kept anyway, because a translator that collapsed an arm would return the wrong shape the
  day a fourth subject kind arrives.

**V8 symmetry stays the caller's to encode.** The translator never injects `^rel` for a relation type
declared symmetric: §3 forbids rewriting, and a rewritten query answers a different question. So
`ent:b rt:peers ent:a` answers `false` over `a -peers-> b`, and the gate reports
`directions: "both"` alongside it. Both facts at once is V8's whole content on this side of the seam.

### 7.5 The symmetry hazard, confirmed

`(p|^p)` under `GRAPH` scoping — the construct and position Comunica 5.4.1 silently mis-answers —
survives the round trip. The ten-row §6 oracle is re-run as SPARQL TEXT over the real projection in
`test/sparql-parse.test.ts`, under both scopings, with the scoping-equivalence assertion on top. The
one-quad reproducer answers `true` in both branch directions, and a structural assertion pins the
translated predicate to a two-branch alternation with the inverse second, in written order — so a
translation that normalized, reordered or deduplicated the branches would fail even if the `ASK`
still passed.

### 7.6 Bundle cost [measured]

The project's `build.mjs` does not minify, and nothing in `src/ui/`, `src/app/` or `src/worker/`
imports the SPARQL layer yet, so **`dist/workbench.js` is unchanged at 555,361 bytes**: esbuild
tree-shakes the whole layer out. Wiring it into an entry point belongs to another unit. The real cost
was therefore measured directly, bundling an entry that imports `answerSparql` against one that
imports only `evaluate`:

| | raw | gzipped |
|---|---|---|
| delta, unminified (the build's current setting) | +204,354 B | +41,819 B |
| delta, minified | +115,607 B | +32,368 B |
| `sparqljs` + `rdf-data-factory` alone, minified | 98,584 B | 27,208 B |

The parser alone at 27,208 B gzipped confirms §7's earlier 27,198 B to within ten bytes. The rest of
the delta — roughly 17 KB raw minified — is `parse.ts` and what it pulls in. Against Comunica's
+273 KB minified floor (§2), the parser costs about 42% of what the engine would have, and it buys a
correct answer on the construct the engine gets wrong. **Stated plainly: unminified, the served
bundle will grow about 37% when the layer is wired in.** Minifying the build would recover most of
that and is a separate, cheap decision.

### 7.7 Findings for other units

- **`project.ts` and `licensing.ts` prose** — both describe `GRAPH ?g { … }` as the cross-model union.
  §7.2 measures that it unions per-graph solutions and does not merge graphs, so the escapability
  claim §2 rests on needs a dataset clause. Both doc comments want correcting; neither file is this
  unit's.
- **`LicensedQuestion` names ONE relation type** and a SPARQL query may traverse several. The gate
  runs for every one and all must pass, but the brand handed to `evaluate` describes only the first
  by sorted id. `evaluate` reads just `scope` off it, so nothing is wrong today — the brand simply
  under-describes a text query. A `relations: readonly string[]` field, or a `LicensedQuery` holding
  N admissions, would make the certificate say what was actually checked.
- **`sparqljs` is deprecated on npm** and `parse.ts` is its only importer, reaching it through one
  narrow local declaration. Replacing or vendoring it is a bounded job confined to that seam.

---

## 8. The `exhausted` route, and what a capability is (261002, WB-EXHAUST)

Two gaps, both left open on purpose by waves that declined to guess. One was a seam detail; the
other was a question about the registry's own vocabulary.

### 8.1 Closing the route: publish the gate's INPUT, never its output

`exhausted` is the fourth arm of `evaluate`, and its prose said to route the question to the analysis
Worker. The Worker was wired and running, and the route still did not exist. §7.7 recorded why:
`resolveExhausted` needs an unbranded `SeamQuestion`, `translate` returned the branded
`LicensedQuestion`, the brand is a `unique symbol` no serializer carries, and the derivation that
built it was private to `parse.ts`. The facade could see that a question had exhausted and could not
say which question it was.

`TranslatedQuery.questions: readonly RelationalQuestion[]` closes it, and the distinction that makes
the field safe is the one worth writing down: **a `SeamQuestion` is what you hand a checker; a
`LicensedQuestion` is what the checker hands back.** Publishing the first weakens nothing. The
certificate is still obtainable only from `admit`, `license` is still the one cast and still
module-private, and the brand still cannot be serialized — so every thread that evaluates runs the
gate itself. The licensing gate running once per *evaluating thread* rather than once per question
is a property nobody designed; it falls out of a symbol not surviving `postMessage`, and it is kept.
`test/worker.test.ts` asserts it three ways: the cast is unique, the protocol does not import the
branded type, and the Worker refuses a question the model declines after it crossed.

Three consequences followed, each a correction rather than an addition:

- **The protocol arm went plural.** `question: SeamQuestion` became
  `questions: readonly SeamQuestion[]`, because a SPARQL query may traverse several relation types
  and `translate` admits every one. A single-question request would have made the Worker's gate
  *weaker* than the gate on the thread that sent it: a licensed type would carry an unlicensed type
  into evaluation beside it. An **empty** list is refused rather than waved through — the dangerous
  reading of "no subject" is "nothing objected", which is an ungated evaluation wearing a satisfied
  check's clothes. The wire is an unchecked cast (`event.data as WorkerRequest`), so the type cannot
  be the control there; `noSubjectDeclared()` is, and it is the same refusal the translator already
  used for a query that traverses nothing.
- **`relations: readonly string[]` was deleted.** It reported the same derivation with four of its
  five fields discarded. Two views of one derivation is the drift this layer removes on sight, and
  the relation ids are `questions.map((q) => q.relation)`.
- **Three arguments became one handle.** `resolveExhausted(spent, question, query)` became
  `resolveExhausted(escalation)`. `ExhaustedEscalation` is issued by `answerSparql` **only** on the
  exhausted path, which keeps the Worker's budget the escalation of a question that ran out rather
  than a fast lane around the interactive one — and removes the hazard the three arguments carried,
  since a spent result beside another query's algebra type-checks and answers the wrong question
  with a bigger budget.

**Three outcomes stay three.** `exhausted`, a refusal, and an empty result tell a caller different
things — this path ran out of budget; the model does not license this; no solutions exist — and only
the first has anywhere to go. So only the first carries a handle, and `test/services.test.ts` pins
all four arms at the facade. Collapsing any two would reproduce in our own code the defect that
ruled Comunica out.

### 8.2 Does `analyze` cover configuration-space exploration? No.

The previous wave declined to settle this and its argument was sound: `analyze` names
`workspace.runSavedQueries` as its service and summarises as re-running saved questions, which
walking the configuration space is not. Settled here as **exploration is its own capability**, on
three grounds.

**The `query` row's precedent does not reach.** `window.mage.sparql` is a *syntax* for asking a
query; `window.mage.ask` is the same answer *with its grounding*; `window.mage.analysis.
resolveExhausted` is the same question under a *larger bound*. All three ask one thing of one system
and get back an answer carrying coverage and a hash, which is why all three sit on the `query` row
and none mints a capability — a bound is not a capability. Exploration answers a different question
and returns a shape no other capability produces: a `SpaceSummary` of states explored, completeness,
stop reason, dead ends and the explorer's disclosed rewrites. One capability with several spellings
is the precedent; this is two capabilities.

**Folding it in would have broken the one job `service` has.** UX-I1 compares that string to check
that both interfaces converge on one seam. A row covering both re-running saved questions and
walking the space can name only one of `workspace.runSavedQueries` and `workspace.explore`, so the
string would stop describing half its own affordances.

**And the fold would have laundered the gap.** No human control reaches exploration — the facade
offers `explore()`, the page composes the Worker port, and nothing in the UI calls it. Inside
`analyze`, that gap is invisible: `analyze` has a wired human affordance for a different reason, so
UX-I1 would read zero while exploration stayed human-unreachable. **UX-I1 now reports one violation
over twenty-five capabilities**, and the violation is `explore-space` with its human affordance
declared `absent` and a note saying what would close it. A count that reads zero because something
is missing from the census is unfalsifiable; a count that reads one is a work item. This project has
twice chosen an accurate violation over a comfortable number — `create-model`, `delete-model` and
`add-note` were declared before they were buildable, and each violation named the work that closed
it.

`describe()` therefore advertises `explore-space` and lists the gap. That is FR-AGENT-2 both ways: an
agent learns the capability exists, and learns it is reachable from no human control, so it knows
that using it creates a divergence the user cannot inspect.

### 8.3 Findings for other units

- **The §20 capability table has no exploration row.** Its `Analyze` row names "analysis API", which
  is `window.mage.analysis` — both methods, under one name. The registry splits them for the reasons
  above, so a registry row now has no specification row. That is a finding about
  `requirements-human-ux-261002.md`, which is not this unit's file; `test/capabilities.test.ts`
  records it beside the §20 coverage check rather than leaving the check's silence to look like
  cover.
- **`explore-space`'s human affordance is one control away.** Something that calls
  `workspace.explore` and renders the `SpaceSummary` — states explored, complete, stop reason, dead
  ends, notes. The facade and the Worker are both already there; the registry note names the site as
  `analysis-section.explore` so the closure check will recognise it when it lands.
