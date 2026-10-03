# RULED — the model-type registry (UX-I9)

**Status: ruled 2026-10-02.** `requirements-learn-261002.md` adds UX-I9: every public model type
gets a Learn entry derived from the same model-type definition the workbench uses, with the
standing caution that a registry nothing consults is a hand-maintained brochure. This document
records what the public model types turned out to BE, the three rulings that shaped the registry
(`src/engine/model-types.ts`), and the alternatives each ruling rejected.

---

## What the kernel's model types actually are — determined from code, not from the sketch

The kernel distinguishes **three** model types, structurally rather than by any declared `type:`
field:

| Type | Substrate | Shape authority (code) | Semantics | Query dialect |
|---|---|---|---|---|
| structural model | `system.models` | `CanonModel`, `CanonRelation`, `CanonRelationType` (`src/ir/types.ts`) | `SEMANTICS.md` §3 | `kind: graph` (`GRAPH_FORMS`) |
| state machine | `system.machines` | `CanonMachine`, `CanonTransition` | §4 | `kind: behavior` (`BEHAVIOR_FORMS`) |
| quantitative model | `system.quantities` + `system.accounting` | `CanonQuantity`, `CanonAccounting`, `DIMENSIONS` | §5.2–5.3 | `kind: quantity` (`REQUIREMENT_METRICS`) |

Two facts a reader of the Learn sketch would not guess:

- **`CanonModel` carries no kind field at all.** `canonicalize`'s `models()` reads `label`,
  `purpose`, `entities`, `relations` and annotation — a `type:` key on a model is silently
  dropped. The generated affordance model (`generateAffordanceModel` in `src/app/capabilities.ts`)
  emits `type: graph` on its model; the kernel ignores it. Harmless today, but it is YAML
  asserting a taxonomy the kernel does not declare. Noted, not fixed — `capabilities.ts` is held
  by another agent.
- **The quantitative model is not a `models:` entry.** v0.1 has exactly one quantitative model per
  system — the `quantities:` map plus its `accounting:` declaration (`RDF-VOCABULARY.md` says so
  explicitly; `CanonicalSystem.accounting` is a flat system-level map). A Learn entry describing
  it as "a model you add like the others" would be false; the registry's `wouldLicense` text says
  what declaring one actually takes.

Where the kernel already made the three-way distinction before this change, each site hardcoded
its slice: the dispatch ternary in `runTypedQuery`, the two form vocabularies, the quant metric
table, the SPARQL seam's structural-vs-behavioral routing, and the app layer's
`"graph" | "machine"` pairs (`src/app/examples.ts`, `scripts/gen-example-coverage.ts`).

---

## Ruling 1 — three registry types; the fourth card is a USE, on a declared second axis

The author's gallery shows four cards: Structural Graph, State Machine, Quantitative Model,
Data / Policy Model. The kernel has three types. Message Bus's `data-policy` is an entry in
`system.models`: a structural graph whose contribution is entity properties over an ordered-enum
`sensitivity` domain, joined across models by shared identity. There is no data/policy construct
anywhere in the IR, the schema, or the semantics.

**Ruled:** the registry declares the three kernel types; the gallery's fourth card is a
**use** — `MODEL_TYPE_USES` in `src/app/learn.ts` — carrying `ofType: "structural-graph"`, the
kernel features that enable it (`DomainKind` ordered enums, domain-typed `PropertyValue`,
`GraphWhere` comparisons), and a shipped exemplar (`message-bus/data-policy`). A use card must
say what it is underneath; that sentence is the ruling.

**Rejected: a four-type registry.** It would assert a kernel distinction that does not exist —
the exact drift UX-I9 forbids, committed in the registry itself. Every downstream consumer
(refusals, presence predicates, dispatch) would then need a fourth arm that is a duplicate of the
structural one, or a lie.

**Rejected: three cards and no second axis.** The author's framing is question-first, and "What
information and permissions exist?" is a question students recognise that "structural model" does
not evoke. Dropping the card loses the pedagogy; keeping it as a use keeps the pedagogy and the
truth at once. Cost of the chosen shape: uses live in the app layer, so they are not visible to
the kernel — acceptable, because the kernel has nothing to decide about a use.

---

## Ruling 2 — schema authorities are CITATIONS of existing named symbols, resolution-tested

The sharpened requirement: each registry entry must point at where its type's shape is DEFINED,
and the pointer must be the single source of truth, never a restatement.

**The dispatch premise did not survive verification.** The brief named
`workbench/src/ir/schema-model.ts` with a ~279-line monolithic `MAGEModelSystem` interface whose
per-type shapes would have to be factored out or cited via discriminating fields. **Neither the
file nor the symbol exists in this tree** (`grep -rn "MAGEModelSystem|schema-model"` over
`src/`, `test/`, `scripts/` and the docs: zero hits). The dilemma it posed — invasive refactor
versus weak monolith-pointer — is therefore moot: the per-type shapes already exist as separable,
exported, named types in `src/ir/types.ts`, one cluster per model type, alongside per-section
keys in `mage-model.schema.json` and per-type headings in `SEMANTICS.md`.

**Ruled:** each entry's `schema` field is a list of `SchemaAuthority` citations —
`{file, symbol, role}` — naming the TypeScript types (kernel behavior, authoritative), the wire
schema section (published authoring format), and the SEMANTICS heading (normative prose). Where
the three could disagree, the TypeScript is what the kernel does; the citations record all three
so a disagreement is findable. A test (`test/model-types.test.ts`) asserts every cited file
exists and contains the cited symbol, so a moved or renamed authority fails the build instead of
leaving a dangling pointer.

**Rejected: restating each shape in the registry** — the brochure one layer down; a field rename
in `types.ts` would strand the copy. **Rejected: factoring `schema-model.ts`** — nothing to
factor. **Cost of the chosen shape, stated:** a citation is a text pointer held by a
contains-check, not the compiler; a rename that leaves the old name in a comment of the cited
file would fool it. The compiler-held part is real nonetheless — `propertyFamilies` holds the
engine's vocabulary arrays **by reference** (`GRAPH_FORMS`, `BEHAVIOR_FORMS`,
`REQUIREMENT_METRICS`), and a test asserts reference identity, so capability claims cannot drift
even in principle.

---

## Ruling 3 — the kernel consults the registry at the substrate-absence rung

A registry the kernel does not read satisfies UX-I9 in letter and voids it in substance. The
consultation site chosen: `runTypedQuery` (`src/engine/index.ts`) looks up the asked query's kind
in the registry and, when `presentIn(system)` is false, refuses with the registry's own sentence
(`absentSubstrateProse`) under a new `RefusalReason`, `missing-model-type`.

**This fixed a live defect, found while probing for the site.** Before the rung:

- `latency` measured over a system declaring **no quantities** answered `holds` with magnitude
  **0 ms** — the charge table was empty, every trace totalled zero, and the figure looked
  measured. Reproduced on message-bus AND worker-queue. `peak_memory` likewise reported 0 MB.
  This contradicts the project's own stated principle ("an honest empty result beats a zero that
  looks measured", `test/quant-query.test.ts`).
- `deadend` asked of a **machineless** system held, exhaustively, over the one empty
  configuration — a behavioral claim about a system that models no behavior.
- `reach` on a machineless system refused with `unknown-vocabulary` ("'worker.state' names
  nothing…") — true, and a typo hunt, the failure mode the omission rung
  (`src/engine/omission.ts`) was built to end.

The refusal now names the absent TYPE and the authoring move that would license the question —
the requirement's own NOT ANSWERABLE sketch ("you may need a Quantitative Model"), generated from
the same object a Learn page renders, so the two cannot describe different capabilities.

**Rejected: registry-as-dispatch-table** (entries carry the evaluator; the ternary becomes a map
lookup). It moves the dispatch without adding a held claim — the discriminated union already
closes the kind set — and costs the type narrowing the ternary gets for free. The rung, by
contrast, adds a semantic behavior that exists only because the registry does.
**Rejected: app-layer-only registry** (`src/app/`), as the brief's directory suggested. The
engine cannot import the app layer (dependencies point inward; the component model gates it), so
an app-level registry is structurally incapable of being consulted by the kernel — the brochure
by construction. The registry therefore lives in `src/engine/`, beside the vocabularies it
references; `src/app/learn.ts` is the app-facing derivation.
**Rejected: wiring the SPARQL seam in the same change.** The seam's refusals are parity-pinned
against the engine's sentences (V32); extending both sides is a follow-up with its own tests.

**Known asymmetry, recorded:** `validate.py` evaluates graph queries and does not implement the
rung. Today this is unobservable — every repo model declares `models:`, so the answer-parity
sweep never reaches the rung — but a future committed model with saved graph queries and an empty
`models:` section would fail `test/parity.test.ts`'s answer comparison. The fix belongs in
`validate.py` beside its other causes (`CAUSE_*` constants, ~line 1300) when quantity/behavior
evaluation grows there, or the rung's cause joins the excused list.

---

## What a Learn implementation can now derive

From `deriveLearnEntries()` + `MODEL_TYPE_USES` + `presentTypes(system)`
(`src/app/learn.ts`), with no hand-written capability claims:

- the gallery (type cards with question-first framing; the use card bound to its type);
- per-card: the property families (the engine's own vocabularies, by reference), the schema
  authorities to link, the omissions block, the combine-with pairing and its richer question;
- the workspace tie-ins: `presentTypes` says which cards a loaded system instantiates, and a
  `missing-model-type` refusal carries the type whose Learn entry the NOT ANSWERABLE panel
  should link.

**Dependency, stated not resolved:** whether the Learn surface itself becomes a capability row
with human/machine affordances is a `capabilities.ts` question, and both that file and
`index.html` are held by other agents (including the UX-I8 visible-vs-reachable parity question,
deliberately assigned elsewhere). Nothing in the registry presumes either answer.

## Follow-ups filed here

- **[FIX]** migrate the app layer's hardcoded `"graph" | "machine"` kind pairs
  (`src/app/examples.ts` blurbs, `scripts/gen-example-coverage.ts`) to `ModelTypeId`, which also
  surfaces the quantitative model those vocabularies cannot express.
- **[FIX]** `generateAffordanceModel` emits `type: graph` on a model — a key the kernel drops;
  remove or document it (blocked on `capabilities.ts` ownership).
- ~~**[DESIGN]** extend `validate.py` with the substrate-absence cause before any committed model
  ships saved graph queries without `models:` (the parity asymmetry above).~~ **CLOSED** — ruled and
  landed; see the follow-up section at the foot of this document. The premise was too generous: the
  wrong answer did not wait for a committed model, it shipped to anyone running the CLI.

---

# RULED — the rung at the other two seams (follow-up, 2026-10-02)

**Status: ruled and landed.** Ruling 3 deferred two things: the SPARQL seam ("extending both
sides is a follow-up with its own tests") and `validate.py` (implement the rung, or excuse its
cause). Both are now closed. This section records what the seams actually did before the change,
the one ruling that had to be made, and the seams that turned out to be fine.

## The gap was a reachable wrong answer, not a latent parity risk

Driven, not grepped. Over a system declaring `relation-types:` and `entities:` with an empty
`models:` section — the ordinary middle of an authoring session:

| Seam | Before | After | Pinned by |
|---|---|---|---|
| `runTypedQuery` | `unlicensed` / `missing-model-type` | unchanged | `test/model-types.test.ts:133` |
| `admit` (relational, containment) | **`licensed`** | `missing-model-type` | `test/sparql-seam.test.ts:303` |
| `admit` (behavioral, machineless) | **`routed` to the engine** | `missing-model-type` | `test/sparql-seam.test.ts:335` |
| `answerSparql` (text) | **`ASK → false`, `SELECT → 0 rows`** | `missing-model-type` | `test/sparql-seam.test.ts:397` |
| `validate.py` graph queries | **`refuted`, run reported `clean`** | `missing-model-type` | `test/parity.test.ts:468` |

The two bold rows are the finding worth stating plainly. **A user reaches a wrong answer today
through two of the three doors**, and Ruling 3's note that the asymmetry was "unobservable" is
true only of the answer-parity SWEEP: no committed model has an empty `models:` section, so the
sweep never reached the rung. A reader running `python3 validate.py` on their own file did. "No,
`api` does not reach `gateway`" about a system that models no structure is the `latency: 0 ms`
defect in relational clothing — a definite answer computed over nothing.

## Ruled: `validate.py` IMPLEMENTS the rung; the `ASYMMETRIC` entry is refused

The deciding question is whether a user can reach a wrong answer through the Python path, and the
code answers yes: `validate.py` is a CLI, `run_graph_query` evaluates over `_edges`, and with no
models that adjacency is empty, so `direct`, `reachability` and `successors` all return a
confident `refuted` with an empty findings list. The `containment` query was worse than a
mismatch — it refused as `unsupported-form` with no `where` clause, which is the one shape
`test/parity.test.ts`'s own exemption assertion rejects, so the parity test would have failed
rather than diverged quietly.

**Rejected: adding the cause to `ASYMMETRIC`.** That table is the honest record of rules only ONE
side CAN implement — no RDF projection, no state space, no join evaluator. This side can:
`run_graph_query` already reads `doc["models"]`, so the rung is a presence check and one constant.
An entry would have been an excuse wearing a record's clothes, and it would have left the wrong
answer shipping.

Only the structural arm lands there. `check_queries` skips behavioral and quantity dialects
outright, so an absent `machines:` or `quantities:` section has no question in that tool to be
absent for; the constant says so where it lives.

## One decision inside the seam, and it costs the nicer answer

A `containment` subject refuses, even though the seam could answer it: `project.ts` puts the
entity `contains` tree in the DEFAULT graph, which a system with no models still has. The engine
cannot, because `containment` is one of its graph forms and the registry rung declines the whole
dialect. V32 asks the two interfaces for one decision, so the nicer answer loses to the agreeing
one, and `QUERY_KIND` in `licensing.ts` states that rather than leaving it to a reader to notice.

A behavioral subject over a machineless system also refuses instead of routing. "The analysis
engine answers it" is a promise the engine declines in the next breath — the same objection that
already puts licensing ahead of routing, pointed one rung higher.

## Where the sentence lives, and what holds it

`absentModelType` (`src/sparql/refusal.ts`) is the one constructor, and it GENERATES the sentence
from `absentSubstrateProse` rather than copying it. Nothing new had to be exported: the engine
already published the registry. That makes this arrangement stronger than the omission rung's
beside it, where two ABSENCE clauses are copies held by an agreement test — here there is no copy.
Two call sites, one predicate: `admit`, and `translate` ahead of scope derivation, because a
model-scoped text query resolves its named graph first and over a modelless system that resolution
sends the author hunting a misspelled model name.

`validate.py` reproduces the words (neither tool can import the other's) in its own dash
convention — it carries no em-dash anywhere. The parity test now compares the refusal SENTENCE
beside its cause, folding only that dash: a cause is a bucket, a sentence is what the reader gets,
and nothing held the Python side to anything but the bucket. The new assertion already binds the
two `missing-distinction` refusals the shipped examples reach.

## Every seam checked, including the clean ones

- **`runTypedQuery` / `runQuery` / `runSavedQueries`** — rung present since Ruling 3. Clean.
- **`admit` + `answerSparql`** — gap, closed here. The Worker's `sparql` arm re-admits on its own
  thread and inherits it; `Workspace.sparql` and `window.mage.sparql` pass through.
- **`validate.py`** — gap, closed here.
- **Worker `analyze-saved` and the default query arm** — reach `runSavedQueries` / `runQuery`.
  Clean by inheritance, verified by reading the handler rather than assumed.
- **Worker `explore` arm** — calls `exploreSpace` directly. Over a machineless system it reports
  one state, `complete: true`, and **one dead end**. Not fixed, and the call is arguable: the
  configuration space of a machineless system genuinely IS one empty configuration with no
  successors, so the number describes the space rather than making an architectural claim. But a
  reader shown "1 dead end" will read it as a finding about their system, and the UI that shows it
  is held by another agent. **[FIX]** worth a look.
- **`runPastTimeQuery` (`src/engine/history.ts`)** — bypasses `runTypedQuery` and calls
  `runBehaviorQuery` directly. Exported from the engine's index with no caller anywhere in `src/`
  or `index.html`, so it is latent rather than reachable; over a machineless system its
  `controlAtom` resolution fails, which refuses — but as a vocabulary miss, which is the typo hunt
  the rung replaces. **[FIX]** when it acquires a caller. Left alone here: `src/engine/` was out
  of this change's scope beyond exporting a sentence, and nothing needed exporting.
