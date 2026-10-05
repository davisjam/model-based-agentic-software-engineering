# INVENTORY — the question palette: what a student can already ask, and what no template expresses (261005)

**Steps 1–3 of the author's reordering, deliberately not step 4.** This document inventories what
each query dialect can express, maps every shipped example's questions onto the templates, and names
the course-relevant questions no template expresses — so that the decision about any extension can be
made *from* this evidence rather than inside it. It designs nothing: no formula surface, no registry
row, no schema vocabulary. Where the evidence points at one, the pointer is recorded and the
paragraph stops.

**Baseline, measured at this worktree's HEAD (`46614d00`):** `npm run check` clean (tsc, Node
24.21.0 on the pin), `npm run test` 1389 pass / 0 fail / 0 skipped, `npm run check:parity` 0
violations over 26 capabilities. Matches the brief's figures.

**Method for every table and count below.** Form inventories are read from the declaring arrays
(`src/engine/types.ts`, `src/quant/requirement.ts`) and the registry that holds them by reference
(`src/engine/model-types.ts`). Example-question counts were derived by a throwaway script that joins
each `examples/<id>/system.mage.yaml` `queries:` block (the query documents, keyed by id) with the
same example's `expected-results.yaml` `queries:` rows (curation and the `suggested` flag); re-run
the join to re-derive any figure. No count here is a census pin; each is a measurement with its
derivation named.

---

## 0. Three sets, kept apart throughout

The brief's discipline, applied first because everything below depends on it:

- **ENGINE** — what `src/` can evaluate when called.
- **LANGUAGE** — what an author can write in a `.mage.yaml` document and have `parseQuery` accept
  (`src/engine/types.ts:433–458`: three kinds, closed form enums, quantifier required).
- **UI** — what a student can compose or run from the shell without writing a document.

These are strictly nested today, and the nesting is wide at both seams. The engine evaluates full
LTL (`src/engine/ltl-product.ts` — parser, Büchi automaton, product, counterexample, verdict; tested
by `test/ltl-automaton.test.ts`, `test/ltl-product.test.ts`, `test/ltl-bridge.test.ts`,
`test/acceptance-p1-p5.test.ts`) and past-time precedence questions
(`src/engine/history.ts`, exported at `src/engine/index.ts:51`); the language reaches neither — the
LTL layer has "no entry point: no query form, no schema vocabulary, no capability row"
(`SCOPE-v03-temporal-slice-261005.md`), and the query schema says in terms that "a past-time question
is NOT expressed here" (`mage-query.schema.json:68`). The language in turn expresses all nineteen
forms across three dialects; the UI lets a student *compose* only one dialect (§2).

One instrument note, because it explains why this had to be measured by hand: the UX-I1 parity gate
censuses *capabilities*, and `query` is one capability with one service (`src/app/capabilities.ts:598`).
Per-capability parity is blind to per-form coverage — the registered reasoning is explicit that the
ask controls "narrow what can be ASKED, they do not add a way to answer" (`capabilities.ts:602–604`)
and that the graph-only form is "a limit of the FORM and not of the capability … not a UX-I1 gap"
(`src/ui/view-model.ts:369–374`). So the gate is green over exactly the asymmetry this document
measures. That is the gate working as specified, not failing; it just means no existing control
answers the palette question.

---

## 1. Per-dialect expressiveness inventory

### 1.1 Graph — ten forms, the only dialect a student can compose

`GRAPH_FORMS` (`src/engine/types.ts:148–151`). Parameters: `relation` (required), `from`/`to`,
`max-hops`, `where` (property constraints on endpoints plus cross-property comparisons,
`types.ts:204–217`). Licensing: the five composing forms are gated per relation type by V7
(`GRAPH_COMPOSING`, `types.ts:184–186`).

| Form | Question (plain words, from the engine's own `interpretation`) | UI route | Label |
|---|---|---|---|
| `direct` | is this one declared edge present? | Advanced only (contextual slot deliberately null — subsumed by predecessors/successors, `askbar.ts:109–110`) | derived |
| `reachability` | can B be reached from A through this relation? | **contextual** (slot `to`) + Advanced | derived |
| `path` | by what path? | Advanced only (pair question, `askbar.ts:107–108`) | derived |
| `shortest-path` | by what shortest path? | Advanced only | derived |
| `all-paths` | by which paths, all of them? | Advanced only | derived |
| `predecessors` | what points at this entity? | **contextual** (slot `to`) + Advanced | derived |
| `successors` | what does this entity point at? | **contextual** (slot `from`) + Advanced | derived |
| `cycles` | does the relation graph contain a cycle? | Advanced only, awkwardly — the form demands an endpoint (`view-model.ts:423–427`) the question ignores (`graph.ts:536–537`) | derived |
| `components` | what is connected, transitively, to this entity? | **contextual** (slot `from`) + Advanced | derived |
| `containment` | what contains / is contained by this? | neither contextual (null with a recorded reason: "wants a selection-scoped item of its own", `askbar.ts:112–114`) nor cleanly Advanced (requires a `relation` it ignores) | derived |

"Derived" means the strongest property this codebase has built and the one worth preserving: the
offered sentence is the engine's own reading of the query that will run — `labelFor` routes the
request through `planAsk` → `parseGraphQuery` → `interpretation` (`askbar.ts:151–156`), so label,
question and saved statement are one string from one source.

Two palette-texture gaps *within* the strong dialect, both measured:

- **The Advanced form offers no `where` clause** (`view-model.ts:422–427`: "write one in structured
  source for that"). Three of the shipped suggested questions are `where`-filtered `direct` queries —
  including Message Bus's key property `restricted-data-reaches-impermitted-subscriber` and
  Autonomous Delivery's `lower-authority-commands-higher` — so the *most pedagogically central graph
  question shape in the corpus* is runnable only as a saved query, composable by nobody in the UI.
- **Contextual coverage is four of ten forms** (`CONTEXT_SLOT` non-null members, `askbar.ts:116–127`),
  each null a recorded decision. The totality of the record over `GRAPH_FORMS` is the control to keep.

### 1.2 Behavior — six forms, zero UI composition

`BEHAVIOR_FORMS` (`types.ts:155–157`). Parameters: a predicate (`target` or `predicate` by form), an
optional `avoid` predicate on every form, a `transition` selector for `transition-live`, `limit`
(`types.ts:239–246`). The quantifier is *forced* per form (`NATURAL_QUANTIFIER`,
`behavior.ts:54–61`); a mismatch is refused with the right pairing named.

| Form | Question (from `behavior.ts:483–507`) | Quantifier | Temporal correspondence (§3) |
|---|---|---|---|
| `reach` | does some execution reach a configuration where P (optionally, avoiding Q on the way)? | exists | ⟺ LTL `G ¬P` refuted; with `avoid`: the constrained-until slice |
| `invariant` | does every reachable configuration satisfy P? | forall | ≡ LTL `G P` (identity, §9.1) |
| `recurrence` | can the system re-enter a configuration where P? | exists | none asserted — re-entry is reachability-class, not ω |
| `repeatable-cycle` | can it reach P and then repeat that configuration forever? | exists | ⟺ `F G ¬P` refuted, modulo a dead end satisfying P |
| `deadend` | is there a reachable configuration with no enabled step? | exists | one-directional bridge only, at the stutter-closure boundary |
| `transition-live` | is this declared transition executable somewhere? | exists | none — its propositions range over steps, not configurations |

**UI route: saved queries only, for all six.** No control composes a behavioral query; the one
composition surface is the Advanced form, whose request type is graph-shaped by declaration
(`AskRequest`, `view-model.ts:376–383`) and whose form select is filled from `GRAPH_FORMS` alone
(`view-model.ts:1357`, consumed at `askbar.ts:781`). A selected machine gets a *Learn link*, not
questions (`inspector.ts` `LEARN_ROUTE_FOR`, machine → behavior). A student can RUN a behavioral
question wherever the example's author saved one (the askbar's saved-properties rows, header
run-all, the review section) and can vary nothing about it — not the predicate, not the `avoid`,
not the limit.

**Label: hand-written.** A saved row's label is the author's `name:` string or the id
(`askbar.ts:199–213`). The engine computes a derived reading of every behavioral question
(`interpretedAs`, carried on every verdict) — but no UI layer reads that field (measured: no
`interpretedAs` consumer under `src/ui/` or `src/app/`), so the one dialect whose questions are
subtle enough to *need* the engine's own sentence is the dialect whose palette shows author prose
instead.

### 1.3 Quantity — three metrics × two shapes, zero UI composition

There is no `QUANTITY_FORMS` in `types.ts` — the brief is right about the named constant — but the
ruling it asks for is in §2 below, and the short version is: the form array exists, under another
name. Parameters (`QuantityQuery`, `types.ts:258–266`): `metric` (closed vocabulary `latency` /
`cost` / `peak_memory`, `src/quant/requirement.ts:34`), `target` (which executions — a reach
predicate; category error on configuration-scoped metrics), `within` (a declared `model:`-targeted
ceiling), `limit`.

The dialect has exactly two question shapes, told apart by `within` (`src/quant/query.ts:1–17`):

| Shape | Question | Quantifier (forced) |
|---|---|---|
| measure (`within` absent) | what is the worst case of this metric over the selected executions / the peak over reachable configurations? | exists |
| decide (`within` present) | does every selected execution keep the metric at or under the declared ceiling? | forall |

What a caller can never say is *how to aggregate* — the aggregation is derived from the metric's
dimension scope (§8 of the quantities design; execution-scoped sums-then-maximizes,
configuration-scoped peaks), which is why the §29 `max|min|named` selector stays rejected.

**UI route: saved queries only**, same as behavior — and one rung lower: a quantity is not even
selectable (`SelectionRef` has no member for one, `inspector.ts:195–198`), so there is no selection
from which a contextual quantity question could ever be derived today. **Labels: hand-written.**

### 1.4 The asymmetry, measured rather than asserted

- Composable from the UI: ten graph forms (minus `where`), zero behavior forms, zero quantity shapes.
- Offered contextually from a selection: four graph forms × participating relation types, licensed;
  nothing for any other dialect (`contextualQuestions` builds only `SLOTTED_FORMS` items,
  `askbar.ts:166–190`; `askCatalogue` adds contextual items only for `kind === "entity"`,
  `askbar.ts:228–233`).
- The only surface that shows the full three-dialect vocabulary is the Learn page, which lists form
  *names* per model type ("Question forms the engine decides over a …", `src/learn/main.ts:343`,
  derived by reference from the registry) — names, not instantiated, runnable questions.
- The machine-side convenience vocabulary mirrors the bias: `window.mage.model.{related,reachable,path}`
  are graph-only constructors (`capabilities.ts` M5 note); an agent composes behavior and quantity
  documents raw.

Strongest palette: graph. Weakest: quantity (not composable, not selectable, and see §4.3 on
`cost`). Behavior sits between only because the shipped examples save many behavioral questions —
the student's behavioral palette is exactly the author's saved set for the loaded system, which for
Message Bus (no machines) is empty and correctly so.

---

## 2. The two hypotheses, ruled on

### 2.1 "The askbar catalogue is effectively graph-only" — CONFIRMED, with one refinement

Measured: `grep -c 'behavior\|quantity' src/ui/shell/askbar.ts` = 2, at `askbar.ts:285` and `:295` —
both on the *refusal* routes (the NOT-ANSWERABLE Learn-link derivation `absentTypeFor`, and the
check-report's model-type label). Neither offers a question. The derived, compiler-total,
licensing-aware, label-derived machinery the brief praises is real and is instantiated for
`GRAPH_FORMS` only.

The search was widened past one directory level per the brief's warning: the behavioral and
quantitative forms are offered nowhere else in the UI tree. `src/ui/shell/palette.ts` is the *edit*
command palette (operations, not questions). `src/ui/shell/inspector.ts` offers Learn routes, not
questions. The Learn pages (`src/learn/`) run behavioral and quantitative questions in derived
teaching sections and list the form vocabularies, but offer nothing runnable against the student's
loaded system. The refinement: the askbar's saved-properties rows DO surface behavioral and
quantitative questions — whichever ones the loaded example's author saved — so the student's
non-graph palette is thin and *frozen*, not empty.

### 2.2 "No QUANTITY_FORMS; the asymmetry — fact or accident?" — a modelling fact, and no obstacle to a uniform palette

The brief's reading is accurate at `types.ts` (no such constant; the metric travels as an open
string held to the closed vocabulary by the evaluator, `types.ts:419–431`). But the model-type
registry has already unified the three dialects: `query.forms` is declared "the engine's own form
array BY REFERENCE (`GRAPH_FORMS`, `BEHAVIOR_FORMS`, `REQUIREMENT_METRICS`)"
(`model-types.ts:28–30`), and the quantitative entry declares `forms: REQUIREMENT_METRICS`
(`model-types.ts:983`) with the three metrics as its `primitives`, exactly parallel to the other two
entries (`:738`, `:828`). So the registry's answer is that **the metrics ARE the quantity forms.**

The ruling: the asymmetry is a modelling fact, not an accident, and it is the *right* fact. In the
other two dialects the form carries the question's shape and the author chooses it. In the quantity
dialect the shape axis lives in the MODEL's declarations: the aggregation is derived from the
metric's dimension scope, never chosen per query (`quant/query.ts:12–17`), and the ceiling a
deciding question names is a declared quantity of the system (`within`). What remains query-side is
the two-way measure/decide split, told apart by `within` with the quantifier forced per shape — the
precise analogue of `NATURAL_QUANTIFIER`.

Consequence for a palette, which is what the question decides: **uniformity is available.** A
quantity question is *more* derivable from the loaded system than a graph question, not less — the
offerable set is finite and enumerable from declarations (each metric with declared substrate ×
measure; each declared `model:`-ceiling × decide), and the licensing gates (`presentIn`, the
accounting basis) are already registry-resident the same way the graph catalogue's gates are. The
absence of a `QUANTITY_FORMS` constant in `types.ts` is a naming residue of the dialect's different
shape axis, not a structural obstacle. (Recorded as a pointer only; what to offer is step 4's call.)

---

## 3. Temporal expressiveness: what the six forms jointly reach, and what they do not

The authority is the LTL foundation's §9.1 bridge table
(`DESIGN-v02-ltl-foundation-261004.md:495–503`), which ships as an executed oracle
(`test/ltl-bridge.test.ts` re-expresses every saved behavioral query through its bridge and asserts
verdict equality), plus the forms' own evaluators (`behavior.ts`).

**Jointly reached, over a single configuration predicate at the top level:**

- `G P` — `invariant` (an identity, not an analogy).
- `E F P` (equivalently, `G ¬P` refuted with the prefix as witness) — `reach`.
- a constrained-until slice: `reach P avoid Q` holds exactly when some execution stays out of Q-
  configurations until arriving at a (P ∧ ¬Q)-configuration — `avoid` prunes entered configurations
  including the initial one (`explore.ts:341–342`, `:473`), so this is the existential
  `¬Q U (P ∧ ¬Q)` in all but name. Every form carries `avoid`, and the shipped curriculum leans on
  it (`publish-without-validating`, `commit-without-validating`).
- `G F P` existentially — `repeatable-cycle P` is `F G ¬P` refuted, modulo the one stuttering
  boundary case (a reachable dead end satisfying P), which `deadend` covers from the other side.
- three questions deliberately *outside* configuration-AP LTL, each with its reason recorded in the
  registry (`model-types.ts:839–845` and the per-primitive `semanticBasis` entries): `recurrence`
  (re-entry is a reachability class, not an ω-property), `transition-live` (step-labelled
  propositions), `deadend` (the stutter-closure boundary). These are not holes; they are the forms
  being honest about not being LTL.
- past-time precedence — "can P occur without Q having occurred first" — compiled to a disclosed
  history variable plus `invariant` (`history.ts`), ENGINE-level only: exported
  (`engine/index.ts:51`), schema-excluded (`mage-query.schema.json:68`), UI-absent. The same device
  is hand-authorable in the shipped language (an author adds the Boolean history variable and writes
  the invariant), so this class is a *convenience* gap in the language, not a semantic one.

**Not reached — the candidate list from the brief, confirmed and corrected:**

1. **Nesting — CONFIRMED as the live hole, and the course-relevant core of it is the response
   pattern `G (p → F q)`.** No form takes a temporal subformula; every form takes predicates. The
   nested-safety half of nesting (`G (p → G ¬q)`, precedence/once-class properties) largely reduces
   to the history-variable device above, so the irreducible nesting gap is the half with `F` under
   `G` — which is liveness, see §4.1.
2. **`U` — PARTIALLY reached, contrary to the bare listing.** The existential constrained-reach
   slice `E(¬a U p)` ships today as `reach`+`avoid`. What no form expresses is the universal until
   `A(p U q)` or an until with a non-trivial left side. No shipped example or activity asks such a
   question (measured over the §4 corpus); mark it speculative.
3. **`X` (including under negation) — SPECULATIVE, and the citation dissolves on inspection.**
   "X under negation" appears in the foundation's §9.3 as a *property-test corner for validating the
   checker* ("the combinatorial corners nobody hand-writes — nested untils, X under negation"), not
   as a student question anywhere. No example, activity rung, or requirement in the corpus wants a
   next-step operator. Rank it last.
4. **Fairness-conditioned liveness — the other named boundary, and the one the curriculum already
   teaches by refusal.** "Will it eventually publish?" is out of scope by design (§7.3;
   `agent-api.ts:848` lists it under `notSupported`); P5 is REFUTED on both machines precisely
   because no fairness is assumed, and the acceptance suite records that as the intended teaching
   outcome (`test/acceptance-p1-p5.test.ts` header).

---

## 4. Every example's questions, mapped onto the templates

Corpus: the six shipped examples' `system.mage.yaml` `queries:` blocks joined with their
`expected-results.yaml` rows (method in the preamble). The join yields 54 saved queries, every one
of which appears as a fixture row, of which 28 carry `suggested: true` (5+5+5+5+3+5 across
message-bus, document-processing, worker-queue, transaction-workspace, embedded-sensor-node,
autonomous-delivery — matching the UX-journey design's "28 curated queries").

**Result: all 54 land on a shipped template.** By kind: 16 graph, 30 behavior, 8 quantity. This is
partly by construction — a saved query is written in the closed language — so the sharper findings
are in what the examples ask *around* their saved queries:

### 4.1 The questions that land on NO template — the sharpest result, and it is already self-documented

`examples/transaction-workspace/expected-results.yaml:19–39`, verbatim in its own header: the spec
(§31 of `DESIGN-v02-semantics-261004.md`) assigns this example `G(proposed → F(committed or
refused))` (P5, measured `refuted` with a lasso) and its safety sibling `G(refused → G not
committed)` (measured `holds`). **Neither can be a fixture row, because every row names a saved
query and "no behavior form carries a formula: the LTL checker produces a verdict value and is not
wired to the query facade."** The two properties therefore ship in `test/example-transaction-temporal.test.ts`
and as `kind: question` notes on the `transaction-engine` entity — asked by the curriculum,
answered by the engine, inexpressible in the language, invisible to the UI. This is the exact
evidence shape the author's reordering asked for: a shipped example asking a temporal question no
template expresses.

Related, same example: `verdict-is-eventually-forced` ships as `transition-live` — the nearest
expressible approximation of an eventually-claim — and its fixture note records the correction that
the eventually-claim "IS expressible now" (by the engine's LTL layer) while the model declares no
forcing mechanism.

### 4.2 The activity ladders and curated tasks — everything lands or is design-by-intent

- **Autonomous Delivery's six-rung ladder** (`expected-results.yaml:198–260`): rungs 1–5 each name
  the saved query or requirement that carries them (INSPECT → `path`/`reachability` + a
  `where`-compare; CALCULATE → two quantity measures; CHECK → the five pinned requirements; EXPLAIN
  → the vacuity pair `planning-and-driving-at-once` vs `motion-inhibited-whenever-faulted`; MODIFY →
  the three modifications). Rung 6 (DESIGN) states "there is no canned query" — deliberate, the rung
  asks for a model change, not a question. No ladder question misses a template.
- **Message Bus §9.6 task 2** is withheld for an *edit-operation* vocabulary gap (no operation
  extends a graph model's membership; pinned in `test/witness-reaches-the-view.test.ts`) — an edit
  gap adjacent to but outside this inventory's query scope; noted so it is not mistaken for a query
  finding.
- **Worker Queue's `is-the-scheduler-fair`** is a *deliberately shipped refusal*: a fairness
  question posed as `transition-live` against vocabulary the system does not declare, expected
  `unlicensed`. The curriculum already stages the fairness hole as a lesson — which is evidence that
  the course *wants to ask* fairness-shaped questions, and that the current pedagogy is the refusal
  rather than an answer.

### 4.3 Per-template example coverage — the inventory read backwards

Derived from the same join. Graph forms with zero saved-query coverage: `shortest-path`,
`all-paths`, `cycles`, `components`, `containment` (five of ten — all reachable via Advanced, none
demonstrated by a shipped question). Behavior: all six forms are demonstrated somewhere
(`deadend` exactly once, Autonomous Delivery; `transition-live` twice, one of them the refusal
exhibit). Quantity: `latency` and `peak_memory` are well covered; **`cost` has zero coverage — no
example even declares a money-dimension quantity** (measured over every `quantities:` block:
duration and memory only). A template no example exercises is the mirror image of a question no
template expresses; `cost` is the only template in that position.

---

## 5. What cannot be expressed — course-relevant, each with the example that wants it

Ranked. The first three name a wanting example; the rest are speculative and ranked below them, per
the brief's bound.

1. **The response pattern `G(p → F q)` — LANGUAGE gap** (engine: yes; language: no; UI: no).
   Wanted by: transaction-workspace, *now, concretely* — P5 is assigned by the spec, measured by the
   acceptance suite, and carried to readers in entity notes because no saved query can state it
   (§4.1). The prior position paper (`DESIGN-expressiveness-261004.md` §5 rung 4) recorded a
   `response` form as the named, trigger-gated next step, with the trigger "users actually posing
   response-shaped questions." The evidence here is that the *curriculum side* of that trigger has
   since fired: the spec itself poses the question and the example cannot hold it. Whether that
   satisfies the trigger — and whether the answer is a named form, a formula surface, or "never an
   LTL string" — is step 4, deliberately not taken here.
2. **Past-time precedence as an askable question — LANGUAGE gap, convenience class** (engine: yes,
   `runPastTimeQuery` with disclosed compilation; language: schema-excluded; UI: no). Wanted by:
   the document-processing family — the device's own worked example is "can `published` occur
   without `reviewed` having occurred" (`history.ts:4–7`, SEMANTICS §7.3). Mitigation already in
   hand: an author can hand-build the history variable in the model, so what is missing is the
   disclosed-compilation convenience, not expressive power.
3. **Fairness-conditioned liveness ("will it eventually…") — ENGINE boundary, held on purpose.**
   Wanted by: worker-queue (`is-the-scheduler-fair`, shipped as a refusal exhibit) and by P5's
   affirmative side (refutable today, never affirmable without fairness assumptions). Every surface
   that should disclose the boundary does (`agent-api.ts` `notSupported`; the §7.3 ruling). Any
   change here is a tool-posture decision, not a palette one.
4. **Universal until `A(p U q)` / until with a non-trivial left side — speculative.** The
   existential slice ships as `reach`+`avoid` (§3); no example or activity asks the universal form.
5. **`X` (next-step), including under negation — speculative.** Appears in the corpus only as a
   checker-validation corner (§9.3 of the foundation), never as a student question.

**And the gaps that are NOT language gaps, stated so they cannot be misdiagnosed as one:**

- **Behavioral and quantitative composition is a PALETTE gap, pure.** The language expresses all
  nine non-graph templates; the engine answers them; no UI control composes any of them (§1.2,
  §1.3). The cost is concrete in the shipped pedagogy: Autonomous Delivery's EXPLAIN rung asks a
  student to reason about two invariants' vacuity — they can run both saved queries and can pose no
  variant of either from any surface.
- **`where`-filtered graph questions are a PALETTE gap** inside the strong dialect: the corpus's
  most central graph questions (the Message Bus key property among them) are composable by no
  student (§1.1).
- **Derived labels for non-graph questions are a PALETTE gap:** the engine already writes the
  derived sentence (`interpretedAs`) on every behavioral and quantitative verdict; no UI reads it
  (§1.2). The property worth preserving from the graph catalogue — the label describes the query
  that will actually run — is *available for free* in the other two dialects and currently unused.

---

## 6. Palette gap vs language gap vs engine gap — the classification in one table

| Question class | Engine | Language | UI | Gap class |
|---|---|---|---|---|
| ten graph forms | yes | yes | compose (minus `where`); 4 contextual | `where` + containment: palette |
| six behavior forms | yes | yes | run saved only | palette |
| quantity measure/decide | yes | yes | run saved only; quantity unselectable | palette |
| `where`-filtered graph | yes | yes | run saved only | palette |
| past-time precedence | yes (disclosed compile) | by hand-built history variable only | no | language (convenience) |
| full LTL incl. response `G(p→Fq)` | yes (product layer, oracle-tested) | no | no | language |
| fairness-conditioned liveness | no (refutation only, by design) | no | no | engine boundary, deliberate |
| universal `U`, `X` | yes (LTL layer) | no | no | speculative — no wanting example |

The most valuable negative finding the brief asked to be open to: **for the behavioral and
quantitative dialects, no language extension is needed at all** — the measured deficit there is
entirely palette. The only course-relevant *language* gap with a wanting example is the response
pattern, and it has exactly one shipped example wanting it (plus the spec that assigned it).

---

## 7. What the brief got wrong, or under-specified

- **"The askbar catalogue is … licensing-aware … I counted only two mentions"** — all confirmed
  exactly (§2.1). The refinement: saved rows do carry non-graph questions, so "graph-only" is
  precise for the *contextual/composable* catalogue, not for the surface as a whole.
- **"There is no QUANTITY_FORMS at all"** — true of `types.ts`, but the registry already declares
  `forms: REQUIREMENT_METRICS` for the quantitative type (`model-types.ts:983`), so the dialect is
  form-enumerable today and the brief's "not form-enumerable the way the other two dialects are"
  overstates the asymmetry. The real asymmetry is where the shape axis lives (§2.2).
- **"Nesting, `U`, and `X` under negation are the candidate holes"** — corrected in §3: nesting
  confirmed (response core), `U` partially shipped via `avoid`, `X` speculative with no wanting
  example; fairness belongs on the list and was absent from it.
- **"every suggested: true query … in the activity ladders"** — only Autonomous Delivery ships a
  formal activity-ladder block; the other examples carry their curated tasks as header prose and
  fixture notes (§4.2). All were swept.
- The brief's framing "the bridge equation ships" is right and worth keeping sharp: the bridge
  *equations* ship as a tested oracle over saved queries; the LTL layer they validate remains
  engine-internal with no entry point (`SCOPE-v03-temporal-slice-261005.md`), which is the honest
  v0.2 posture this document inherits rather than disturbs.

---

*Prose only; no code, schema, or example was touched. Gates at this HEAD: check clean, 1389/0/0,
parity 0 over 26 — measured before and unchanged after, since nothing moved.*
