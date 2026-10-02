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
