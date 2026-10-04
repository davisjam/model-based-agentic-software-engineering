# MAGE Model Workbench — plan of work

**Status:** live. Updated as phases land. This file is the durable record; the orchestrator's todo
list is a view of it, not the source.

Semantics: [`SEMANTICS.md`](SEMANTICS.md) — the numbered rules. That file is the authority on how
many there are and what each says; quoting a range here would be one more count with no gate.
Open decisions: [`OPEN-DECISIONS.md`](OPEN-DECISIONS.md) — **all six ruled 261002**.
Architecture: [`models/workbench-components.mage.yaml`](models/workbench-components.mage.yaml)
— and its asserted queries are a build gate, not documentation.

---

## 0. Where we are

| Phase | What | State |
|---|---|---|
| A | Toolchain + semantic kernel (`src/ir/`) | **landed** `6cca06db` |
| B | Numbered rules in TS + Python/TS parity test | **landed** `53063675` |
| C | Engine: graph + state-space + behavioral queries | **landed** |
| D | YAML adapter + transaction engine | **landed** |
| E | Renderer: deterministic layout + SVG | **landed** |
| F | Services facade + `window.mage` agent API (FR-AGENT-1/2) | **landed** |
| G | UI shell + accessible view model + page | **landed**; renderer bound `1f451427` |
| K | Capability registry + UX-I1/I2/I3 + CI assertions (`requirements-ux-261002.md` §22-26) | **landed** `58c20691`, `c7304676` |
| L | Annotation + provenance; A1 held by the hash | **landed** `b0856b0e`; schema + `ANNOTATION` rule `4779477f` |
| H | Integration: gates, Pages build, docs | **landed** `fbdd7b0f`; browser tier `74335d8b` |
| I | Quantitative models — representation + accounting | **landed** `b44b2bed` (V27–V31), `02b4761e` (V35–V37); evaluator pending |
| J | RDF projection + query evaluator + structured not-answerable | **landed** `c21c46e0`, `96010d5f`, `408c2388`, `f032fb81`; `sparqljs` text front-end pending |
| M | Default example systems as the end-to-end suite | **landed** `2ebddc63`; Document Processing in flight |

**UX-I1 is ZERO** — every public semantic capability is reachable from the page
and from an attached agent, and both reach it through the same service. It began the day at 17
violations, ten of them missing a human affordance. The three that held out longest
(`create-model`, `delete-model`, `add-note`) were violating on BOTH sides, which is what told us
they were a missing transaction operation rather than an interface gap — the registry reported that
rather than quietly dropping the rows.

Up to seven waves ran concurrently in worktrees on disjoint footprints. Worktrees inside this
submodule were verified working on 261002, which is what made the split available; the earlier
guidance that gc agents must share `main` was written before anyone tried it.

### 0.1 Companion documents

This plan is the spine; these documents carry detail it should not duplicate.

| Document | What it holds |
|---|---|
| `SEMANTICS.md` | Authoritative semantics, and the authority on its own rule set. |
| `OPEN-DECISIONS.md` | D1–D6, **all ruled.** Kept as the record of what was decided and why. |
| `DESIGN-quantities-261002.md` | Phase I design. Representation is determined; the analysis layer is not. |
| `DESIGN-sparql-261002.md` | Phase J layer 2 design. SPARQL as an interface, per the D3 ruling. |

Plus the verbatim requirement documents (`requirements-*-261002.md`) — CDP agent operability,
accessibility, RDF/SPARQL/SMT, UX, and default example systems. Those are the author's text and are
not edited; the design documents above are where they become implementable.

### 0.2 Open questions index

D1–D6 are ruled, and **eight of the nine questions below are now settled** — four by author
ruling, two by implementation, one by measurement, one by delegation. **Only Q9 still wants the
author.**

This paragraph has been wrong twice, both times in the same direction: it over-reported what was
open, because a question got answered in a design section or in code and nobody came back to the
index. Q1 and Q5 were listed as blocking Phase I analysis while `src/quant/` already implemented
both. If you edit a row below, edit this sentence.

| # | Question | Who resolves | Blocks |
|---|---|---|---|
| Q1 | Interval arithmetic, or worst-case bounds only? | **RESOLVED** — worst-case; the requirement's operator selects the end | — |
| Q2 | What declares the latency accounting model? | **RULED** — declared basis; `entities` for v0.1 | — |
| Q3 | What precise predicate is `memory(c)`? | **RULED** — `residency` / `when`, never inferred | — |
| Q4 | Is expectation in scope for v0.1? | **ANSWERED — YES, by implementation** (`src/quant/requirement.ts`); the recommendation was overturned by what shipped, and the G3 ruling presupposes it | — |
| Q5 | Outcome shape for an unbounded additive maximum | **RESOLVED** — `refuted` + lasso; no new outcome word | — |
| Q6 | Do quantities project to RDF? | **RESOLVED** — structured resources | — |
| Q7 | Can Comunica ship on static Pages at all? | **ANSWERED — NO**, by measurement | — |
| Q8 | SPARQL in the Worker or the main thread? | **ANSWERED — BOTH**: main thread at the interactive bound (`src/app/agent-api.ts:72`), Worker arm for the escalated bound (`src/worker/protocol.ts:85`) | — |
| Q9 | Is "run arbitrary SPARQL" a semantic capability under UX-I1? | **RULED — NO**, and it obliges a *model query interface*; see `DECISIONS-RULED-model-query-261002.md` | the query surface |

**Four of the nine are now settled, and three were settled by something other than argument.**
Q2 and Q3 were ruled by the author — see `DECISIONS-RULED-quantities-261002.md`, which records both
rulings and the reasoning for the alternatives they rejected. Q6 was resolved by layer 1 landing: it
already projects a relation type's own properties as facts rather than flattening them, so quantities
follow the same pattern. **Q7 was answered by measurement, and the answer was no** —
`MEASUREMENT-comunica-261002.md` has the numbers. Only Q9 still wants the author.

Q7's negative result paid for itself twice. Commissioned to ask whether a library could ship, it
found that Comunica silently drops forward branches of an alternative property path inside a `GRAPH`
block — the exact construct this design prescribes, since layer 1 materializes no inverse term (so
symmetry is `(p|^p)`) and each model's relations live in a named graph. Its ten-row table of patterns,
with a *correct* column, is now the conformance oracle for the evaluator we write instead.

### 0.2a Self-models: what we model about ourselves, and what we deliberately do not

Recorded 261004 from `AUDIT-system-models-261004.md`, so the omissions below read as decisions
rather than as gaps a later wave should "complete."

**Four self-models exist:** `models/workbench-components.mage.yaml` (hand-written architecture
constraint), `models/workbench-affordances.mage.yaml` (generated projection of the capability
registry), `models/example-coverage.mage.yaml` (generated capability x example matrix), and
`models/workbench-lifecycle.mage.yaml` (hand-written machine composition, added 261004 by the ruling
below). The two generated ones are byte-exact staleness-gated in CI; `workbench-components` gained a
code join the same day (`test/import-graph.test.ts`); `workbench-lifecycle` has none, and its own
header names the three control-flow facts a checker would have to decide.

**No quantitative self-model, deliberately.** The project does measure real quantities -- the bundle
floor asserted in `.github/workflows/pages.yml`, tier counts, a11y durations -- and MAGE has the
quantity construct (V27-V39, exercised by the `document-processing` example). But that enforcement
lives in CI assertions the workflow could not read out of a model, so a quantities self-model would
be a second source of truth with no consumer. **Revisit when a gate can derive its threshold from
the model**; until that seam exists, adding the model would be decoration. This is a reasoned
omission, not an oversight.

**The machine self-model: ACCEPTED, 261004.** Audit gap 7 / re-audit gap 6, ruled (a) and dated.
`models/workbench-lifecycle.mage.yaml` composes the transaction lifecycle
(`src/transaction/engine.ts`), the hypothesis branch (`src/app/services.ts`), the presented answer,
and the other party on the shared surface. The reason is a second semantic domain, not better
documentation: a machine gives the workbench TRACES beside static relational structure, and "a
stale-base transaction is refused in every interleaving" and "a disposed hypothesis never reaches the
authoritative engine" are propositions over executions that no graph query states and no point-wise
test states either. Nine statements, measured: four claims, four vacuity witnesses, one soundness
check; 70 reachable configurations against docable's 39. Verdicts held by
`test/model-coverage.test.ts`; each claim additionally driven against a mutation control in
`test/lifecycle-model.test.ts`, because a `refuted` earned by a guard and a `refuted` over an
unreachable situation are the same row in a results table. The hypothesis lifecycle alone and the
five-value outcome vocabulary still do **not** earn machines: the first is held by types and the
facade, the second is an enum, not a lifecycle. Two invariants the founding brief proposed were
DECLINED on reading and the reasons are in the model's header — SH-I6 is step-shaped and has no query
form here, and SH-I5 is a totality property of a discriminated union that the compiler holds.

**Model-widening review discipline: DECLINED as a mechanism, 261004.** Re-audit gaps 2 and 5 asked
for a gate holding future `depends-on` widenings to the discipline the 261004 re-founding used — a
CODEOWNERS-style review pin, or a lint asserting each relation row carries a provenance tag. Ruled
(c), declined, in the author's words:

> You cannot mechanize "Jamie has exercised engineering judgment and approves this new architectural
> edge" by requiring a provenance string. That is theater. The model is an authoritative engineering
> artifact; changing its intended architecture is legitimately a review-governed operation. The
> mechanism should enforce conformance to the model, not pretend to determine whether the model
> itself was wisely changed.

The resulting bound, stated so it is not rediscovered as a gap: **no gate distinguishes a ruled
widening from a smuggled one.** `test/import-graph.test.ts` holds the code to whatever
`models/workbench-components.mage.yaml` declares, in both directions; it has nothing to say about
whether the declaration should have changed. An edit that adds a `depends-on` row and the import to match passes every gate. That is the
intended division of labour, not an omission.

**§G3 validation authority: RATIFIED, 261004.** `src/validator/rules.ts` is authoritative for
`validate()`'s result; `workbench/validate.py` is the CI cross-check that never serves the operation,
with enrichment fields outside the compared surface until implemented on both sides. This changes no
behaviour — it fixes what a future parity-disagreement report says the agent's answer WAS.
`VALIDATION_AUTHORITY.ratified` flips to `true` accordingly, since that field exists to let a reader
tell a recommendation from a ruling.

### 0.3 As-built, verified by running it

Verified 261002 by serving the page and attaching headless Chromium over CDP, rather than by reading
the code:

- `window.mage` live: **0 affordance gaps** (UX-I1 satisfied) over the registry's full capability set.
  The operation count is deliberately not quoted here — it moved from 20 to 22 within an hour, and
  `describe().operations` is the registry projected into the page, so the number that means anything
  is "equal to the registry", which the browser gate asserts by derivation rather than by literal.
- The flagship journey executes. `restricted-data-reaches-impermitted-subscriber` → `holds`,
  exhaustive, with a path witness — the cross-model join finding the violation.
  `subscribes-chain-checkout-to-fulfillment` → `unlicensed`, naming path-composition (V7 refusing a
  multi-hop rather than answering `false`). `did-analytics-receive-it-at-2-04` → `unlicensed`, naming
  the undeclared relation type (purposeful omission). Neither refusal is an error; both are answers.
- The human surface agrees with the agent on the same counts — UX-I3 observed across both interfaces
  in one process, which no node-tier test can see.
- The canvas draws real SVG and remains `aria-hidden` and LAST. 52 focusable controls, 0 unlabelled.

This is now a standing gate rather than a one-off observation: the browser tier
(`test/browser/`, run in CI) loads the served page in headless Chromium and asserts the agent
surface, the flagship journey's three outcomes, the human/agent convergence, and the accessibility
properties. It writes a receipt the CI step asserts, because a gate that silently skips reports
coverage it does not have.

⚠️ **Known gaps: see [`AUDIT-v0.1-261002.md`](AUDIT-v0.1-261002.md), not this file.**

This section used to carry the gap list inline. It was refreshed three times in one day and was
stale within the hour each time — at its worst it named six gaps that had all since closed, which
is the failure mode the audit identified as the project's real one:

> The commit log oversells nothing this audit could find. The misleading artifacts are the standing
> prose — the requirement transcripts that later rulings reversed without amendment, and the
> self-descriptions that the product outran.

A commit message describes a delta and stays true. A gap list asserts the PRESENT TENSE about a
system that keeps moving, so it is false the moment the system moves and nothing re-reads it. Every
mechanical claim in this product has a gate; a prose claim has only a reader's goodwill.

So the list lives in the audit, which is **dated, re-runnable, and says how each finding was
measured.** Re-run it rather than trusting either document: the audit is a snapshot too, and the
difference is that it says so and shows its method. Its own findings at the time of writing were
five defects, none in the semantics — a prose/derived mismatch on the page (fixed), this list, a V32
refusal-parity break at the SPARQL seam, and two claims with no gate to keep them current.

## 1. The two new top-level requirements

Added 2026-10-02 from `cdp.md` and `a11y.md`. Both are **definition-of-done criteria, not later
passes.** They are listed before the engine work because they constrain its interfaces.

### FR-A11Y-1/2/3 — Accessibility is an obligation, not a cleanup pass

WCAG 2.1 AA and ADA Title II. All functionality operable without vision, colour perception, pointer
precision, or mouse. The hard part is specific to this application:

- **FR-A11Y-2.** Anything represented graphically MUST have an equivalent accessible
  representation — entities, relations, states, transitions, properties, requirements, hypotheses,
  query results, witnesses, counterexamples, validation errors. Colour, position, line style, shape
  and animation MUST NOT be the sole carrier of semantics. **Model editing and query execution MUST
  be possible without touching the canvas.**
- **FR-A11Y-3.** Consequential async changes (agent actions, analysis completion, validation
  failure, hypothesis creation) MUST be perceivable to assistive technology *without* gratuitous
  focus movement or announcement storms. Compound widgets get correct keyboard and focus behaviour.

**Design consequence for every phase:** the renderer is a *second* view over the same semantic
state, never the primary one. If a fact reaches the SVG without reaching a structured DOM
representation, that is a defect. Evidence highlighting in particular must have a textual twin —
a witness trace is a list of steps before it is a coloured path.

> It would be particularly embarrassing for the modeling workbench used to teach engineering
> obligations to treat accessibility as a cleanup pass.

### FR-AGENT-1/2 — Live agent operability through CDP

A student runs the workbench in a visible Chromium tab and a coding agent alongside it. The agent
attaches **to that same tab** over CDP, discovers a structured API, and operates the workbench; the
student watches the model change.

- **CDP is transport and lives OUTSIDE MAGE.** MAGE opens no debug port, discovers no agent, holds
  no socket, implements no CDP. Its responsibility begins at the page context.
- **One authoritative state.** Human controls, file import, and `window.mage` all invoke the *same*
  application services against the *same* store. **There SHALL NOT be an agent-specific model
  copy.** An agent adding an entity means the ordinary workbench renders it.
- **Exactly one global entry point**, `window.mage`, versioned and self-describing. Implementation
  internals are not API.
- The API must carry: discovery, self-description, semantic inspection, transactions, hypotheses,
  deterministic queries, evidence, view state — plus **schemas, model purpose and omissions, result
  status, coverage, and stable identity**, so an agent can determine what the models represent and
  what the workbench *licenses* without inferring semantics from geometry.
- No server, no embedded LLM, no MCP server, no agent backend, no API key.

**The relationship between the two, which we should not conflate:** a named button helps both a
screen-reader user and a browser agent, and accessibility gives generic automation a surprisingly
good fallback. But `window.mage` goes beyond accessibility — a screen reader does not need a
canonical model hash, a transaction schema, or a coverage object. And `window.mage` does not
*satisfy* accessibility — a keyboard user must be able to operate the real application.

```
                         MAGE semantic state
                                │
             ┌──────────────────┼──────────────────┐
             ▼                  ▼                  ▼
      Accessible UI        window.mage        Visual view
             │                  │                  │
             ▼                  ▼                  ▼
       Human + AT         CDP agent          Sighted human
```

## 1a. The layered architecture (ruled 261002, `requirements-rdf-sparql-smt-261002.md`)

Four deliberately distinct representations. **They are not to be conflated.**

```
.mage.yaml            friendly typed authoring + interchange format
      ↓
Typed MAGE IR         application semantics          <- LANDED, unchanged
      ↓
RDF Dataset           canonical relational projection; one named graph per purposeful model
      ↓
SPARQL / lowering     the standard query language
      ↓
SMT                   only when symbolic reasoning is required
```

**What survives intact.** The typed IR is still the application semantics and still what everything
is built on — §3 says the YAML parser normalizes into it. And §28 independently confirms the hash
decision: *"The semantic revision hash SHALL be calculated over a canonicalized form of the typed
semantic IR, not YAML bytes and not rendered RDF serialization."* That is exactly what `hash.ts`
does, so comments, whitespace, key order and view layout do not change semantic identity.

**What changes.**

- **SPARQL 1.1 (subset) is the standard relational query language, and we do not invent a competing
  graph-query DSL.** Supported subset: SELECT, ASK, basic graph patterns, named graphs, FILTER,
  comparison, property paths, OPTIONAL, COUNT/MIN/MAX/SUM, GROUP BY, ORDER BY, LIMIT. No extensions
  in v0.1; every accepted query stays valid SPARQL. The subset is enforced at MAGE's validation
  boundary, not by reimplementing the language.
- **RDF is a projection, not a replacement, and it is NOT OWL.** No RDFS/OWL inference is acquired;
  MAGE defines its own vocabulary semantics. RDF supplies identity, typed resources and relations,
  properties, named graphs, and a standard query substrate — nothing more.
- **Named graphs are how purposeful reductions compose.** Each model projects to one named graph;
  shared entity identity is what lets a conclusion emerge from the join rather than from any single
  model.
- **`not-answerable` gets structured.** §12 is the most important pedagogical behaviour in the
  document: a SPARQL result answers a question about *represented facts*, not necessarily the
  engineering proposition intended. So the pipeline is: question → required distinctions → are they
  represented? → query, or NOT ANSWERABLE. The result shape grows from a prose refusal to
  `{ status: "not-answerable", reason: "missing-distinction", missing: ["payload-propagation"],
  models: [...] }`.
- **Least-complicated mechanism, one semantics.** §14: do not force everything through SMT. RDF
  lookup, SPARQL property path, direct arithmetic, or SMT — whichever is simplest that preserves the
  semantics. The binding invariant: *"Specialized implementations and SMT implementations SHALL
  implement the same MAGE semantics. Optimization must not create a second semantics."*

### 1a.1 Library decisions (researched by the author, §27)

| Concern | Choice | Note |
|---|---|---|
| YAML | `yaml` (eemeli) | already our dependency; document/CST API preserves comments |
| RDF store | RDF/JS + N3.js | in-memory store; Turtle/TriG export comes nearly free as a debug format |
| SPARQL | Comunica | queries RDF/JS sources directly; *"start with Comunica rather than writing even a 'small' SPARQL evaluator"* |
| SMT | z3-solver (WASM) | **feasibility risk — see below** |
| Layout | `@dagrejs/dagre` | synchronous, DOM-free; computes rank + order, not pixel coordinates. Landed (`05df440d`, `1b74d89c`), replacing the hand-rolled placer. **Not** ELK.js (promise-only — disqualified by the synchronous-render contract), Graphviz-WASM (async WASM init), or Mermaid/PlantUML |
| Persistence | IndexedDB | a wrapper is optional and not architecturally important |

### 1a.2 ⚠️ z3-on-Pages is a verified blocker, not just a spike

The author flagged z3 as *"the one library choice I would treat as a feasibility spike before
committing the architecture"*, because it uses threads/SharedArrayBuffer and so needs cross-origin
isolation headers.

**Checked 261002: our deploy target is GitHub Pages via `actions/deploy-pages`, and Pages cannot set
response headers.** `SharedArrayBuffer` requires `Cross-Origin-Opener-Policy: same-origin` plus
`Cross-Origin-Embedder-Policy: require-corp`, and there is no mechanism to send those from Pages. So
the threaded z3 build does not work on this host as shipped. Four ways out, cheapest first:

1. **Defer SMT.** §14 already routes only the hardest class to it, and nothing in v0.1 needs it.
   Everything described for v0.1 is deterministic computation over a state space we already build.
2. **A cross-origin-isolation service worker** (the `coi-serviceworker` technique) re-serves
   responses with the isolation headers from a static host. It works on Pages, at the cost of a
   reload on first visit and some fragility.
3. **A single-threaded z3 build**, if one is available without pthreads — no SAB, no headers.
4. **Host the SMT path elsewhere** — rejected: it contradicts "no server, no daemon, static assets".

Recommendation: **(1) now, (3) investigated before any SMT work, (2) only if (3) fails.** This does
not block v0.1.

### 1a.3 Rulings on the seven held questions

All seven accepted (§29). Two carry refinements worth keeping:

- **① path aggregation** — accepted *in substance*, but do NOT make `max|min|named` a fundamental
  execution-path selector. **Distinguish paths/traces from analyses over them.** Bounded monotonic
  variables license finite unrolling; a **positive repeatable cycle makes an additive maximum
  unbounded, and that produces a CYCLE WITNESS** rather than a refusal. Better than what I proposed.
- **③ units** — accepted, and add `ratio` as a dimension class (hit rates, probabilities).

②, ④, ⑤, ⑥, ⑦ and both smaller points (stable-ID addressing resolved during validation; explicit
model metrics) accepted as proposed. Phase I is therefore **unblocked** — see §7, which this
supersedes on the open-question list while leaving the engineering content valid.

## 2. Phase C — Engine  *(disjoint: `src/engine/**`)*

Depends only on the landed kernel. Owns no DOM, no YAML, no rendering.

1. **`graph.ts`** — `direct`, `reachability`, `path`, `shortest-path`, `all-paths` (bounded),
   `predecessors`, `successors`, `cycles`, `components`, `containment`. A multi-hop form over a
   relation type with `composition.path: forbidden` returns `outcome: "unlicensed"` with a refusal
   string — **a successful result, never an error** (V7). BFS so a witness is the shortest path, and
   therefore the most legible counterexample. Port behaviour from `validate.py`'s evaluator, which
   is the reference for the forms it already covers.
2. **`explore.ts`** — the configuration space. A configuration is control states per instance plus
   every variable's value, and nothing else (V16/V18 keep properties and derived values out, which
   is what preserves finiteness). Steps are: a **local** transition (no `sync`, guards hold in the
   pre-state), or an **event** step where *every* participant offers an enabled `sync` transition
   and all effects apply atomically. Guards evaluate against the PRE-state (§4.1). Effects are
   restricted to `<var> <+|-> <int>` or a literal — reject anything else rather than evaluating it.
   Honour a state limit; report `coverage.kind: "bounded"` with `reason` when it trips.
3. **`behavior.ts`** — `reach`, `invariant`, `recurrence`, `deadend`, `transition-live`. Evidence:
   a finite **trace** for reach; a **counterexample** for a violated invariant; a **lasso**
   (prefix + cycle) for recurrence. Under bounded coverage the outcome is `inconclusive` and MUST
   NOT render as `refuted` (V22).
4. **`history.ts`** — a past-time question compiles to a safety property over an auxiliary boolean
   history variable, and the rewrite is **disclosed** in `result.compilation` (V23). No past-time
   operators in the engine.

**Must not:** implement fairness or liveness (explicit non-goal); add a fourth outcome; return a
bare boolean anywhere.

## 3. Phase D — YAML adapter + transactions  *(disjoint: `src/yaml/**`, `src/transaction/**`)*

1. **`src/yaml/`** — parse to a loaded doc, and serialize **preserving comments and key order**.
   Use the `yaml` package's Document/CST API; parse→object→stringify is not acceptable for a
   format advertised as Git-friendly and hand-edited. A round-trip test must prove a commented file
   survives a tool write byte-for-byte except where semantics changed.
2. **`src/transaction/`** — the op set from `mage-transaction.schema.json`. Application order is
   fixed and atomic: **parse → verify base → apply to a temporary IR → validate the ENTIRE
   resulting system → commit.** Any failure leaves the current system byte-identical. Base mismatch
   is a loud rejection, never a merge. Ids are immutable (V2): no rename op; `set-label` changes
   labels; identity change is delete-plus-add so the diff shows it. `delete-*` without `cascade`
   fails if anything still references the id — dangling references are never created silently.
3. Undo/redo falls out of the same mechanism: keep the stack of systems, not a stack of inverse ops.

## 4. Phase E — Renderer  *(disjoint: `src/render/**`)*

1. **`layout.ts`** — deterministic, seeded by stable ids, so the same model always lays out the
   same way. Ranked layout: topological ranks for DAG-ish graphs; for cyclic machines, ranks from
   the initial state with backedges routed around. **Existing positions are strong hints** for
   incremental layout: adding one state must perturb locally, not re-rank the world. This is an
   acceptance criterion, not polish — the core interaction is comparing before against after, and
   that comparison is unreadable if everything moves.
2. **`svg.ts`** — entities as rounded rects, states as state nodes, an initial marker, directed
   edges, containment as enclosing regions, selection, **evidence emphasis**, violation treatment,
   de-emphasis. No external assets, no CDN, no fonts fetched.
3. **FR-A11Y-2 obligation on this phase:** every visual distinction the renderer makes must be
   available non-visually. Emit the structured representation alongside the SVG rather than leaving
   it to the UI to reconstruct — the renderer knows what it drew and why.

## 5. Phase F — Services facade + `window.mage`

The facade is written **before** C/D/E land so the UI and the agent API can both code against it.
One module, `src/app/services.ts`, exposing load/validate/query/transact/hypothesis/view
operations. Both the UI and `window.mage` call *only* this. That is what makes "no agent-specific
state" structural rather than aspirational, and the component model's `may_mutate` assertions are
what hold it.

`window.mage` adds: `version`, `describe()` (self-description including the three schemas),
`context()`, model/entity/machine inspection, `transact()`, `hypothesis()`, `query()`,
`evidence()`, and non-semantic `view()` operations. Every result carries the system hash it
describes, so an agent (and the UI) can never present a stale answer as current.

## 6. Phase G — UI + accessibility, and Phase H — integration

- UI shell: import/export, model list, selection, inspector, saved-query list with re-run on
  change, evidence display, hypothesis branch with current-vs-hypothesis diff.
- Accessibility is built in per FR-A11Y, with automated checks (axe is already a repo devDependency)
  **in the gate**, plus keyboard-only operation of every feature including query execution.
- Integration: the pre-push `workbench` scope runs `tsc --noEmit`, the test suite, `validate.py`
  over every model, and the bundle build; the Pages workflow builds the bundle and publishes it.

## 7. Phase I — Quantitative models  *(HELD pending seven decisions)*

Promoted into v0.1 scope by the author: dimensional quantities, expressions, aggregation and thin
requirements, with SMT deferred. Reviewed 2026-10-02; **two of the seven change the IR shape, so
nothing is built until they are ruled:**

1. **`over: execution-path` does not denote a path.** With nondeterminism there are many paths and
   with a cycle infinitely many, so `sum` diverges. Proposed rule: `min`/`max` over paths are
   defined iff the reachable **configuration graph** is acyclic; otherwise refuse, unless the cycle
   strictly advances a bounded variable, in which case the unrolled graph is acyclic and the bound
   is reported with the answer. Plus an explicit **path selector** (`named`, `min`, `max`).
2. **Quantities live OUTSIDE the state vector.** They are real-valued; V17 forbids reals *in the
   state vector*. Keeping them out is what preserves exhaustive exploration. Must be stated
   explicitly or a reader concludes a latency annotation explodes the state space.
3. **Units are a type system** — declared dimensions with a canonical base unit, literals normalized
   on load, cross-dimension arithmetic refused at validation. Same lesson as V20.
4. **Memory is a state property; latency is a path property.** `peak_live` = max over reachable
   configurations of (Σ retained for each instance's current state + max temporary of an enabled
   transition) — which the existing exploration already enumerates, so memory is nearly free.
   That asymmetry is *why* the aggregation operators differ.
5. **`expected` is in v0.1** (the cache case uses it) and is licensed only if every branch on the
   selected path set carries a declared probability summing to 1 per branch; otherwise refuse with
   the author's own line about deliberately omitted frequencies.
6. **Interval arithmetic's dependency problem:** restrict expressions to monotone operations over
   non-negative quantities (sum, max, min, scalar multiply), where intervals are exact. Forbid
   subtraction and division of symbolic parameters until the solver arrives.
7. **Requirements need three statuses:** `satisfied` (for every value in range), `violated` (for
   some), `indeterminate` (straddles) — which reuses the existing quantifier + coverage machinery
   rather than adding a parallel result type.

Plus two smaller ones: quantities anchor to states, relations and operations, so they need one
addressing scheme with existence checking; and `state_count * transition_cost` introduces **model
metrics** as a new input class, wanting a reserved namespace (`metrics.state_count`).

## 8. How the parallel work is organised

Each parallel phase runs in its own **git worktree of the submodule** — verified to work:
`git worktree add` registers under the superproject's `.git/modules/…` and checks out cleanly. That
removes the single-live-writer constraint, which was only ever about concurrent commits on one
checkout.

- Footprints are disjoint by directory, so no two agents touch a file.
- Each works on its own branch; the orchestrator merges and lands.
- Shared files (`PLAN.md`, `SEMANTICS.md`, the schemas, `package.json`) are **orchestrator-owned**.
  An agent needing a schema change reports it rather than editing it.
- Every phase: `tsc --noEmit` clean, tests passing, and no new dependency without saying why.

## 9. Standing constraints for every phase

- **The kernel depends on nothing.** `src/ir/` imports no DOM, no YAML, no renderer, no agent. The
  asserted queries in the component model fail the build otherwise.
- **No boolean results.** Outcome is `holds | refuted | inconclusive | unlicensed`. "Cannot be
  answered from this model" is a *successful* result.
- **Coverage travels with every answer**, and bounded coverage reads INCONCLUSIVE.
- **`sync:` not `on:`**, and ids that a YAML loader would coerce are refused (V25). Three separate
  casualties in this project already.
- **Every result carries its system hash.** A result outliving its model is the failure the
  analysis-execution model exists to prevent.
- **Comments survive tool writes.**
- Node is pinned by `.nvmrc` (24); `engines` floor is 22.

