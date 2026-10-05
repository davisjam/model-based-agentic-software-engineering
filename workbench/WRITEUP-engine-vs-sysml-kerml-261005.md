# The MAGE engine and SysML v2 / KerML — the full relationship, in syntax and in semantics (261005)

**Status: WRITEUP. No code, schema, fixture, or manifest changed by this wave.**
**Authority:** `src/engine/model-types.ts` (the registry), `SEMANTICS.md` §13 + §13.7,
`DESIGN-v02-semantics-261004.md` §35 (the ruling, the mapping, the fixture shape),
`conformance/manifest.json`, `DESIGN-sysml-differential-conformance-261005.md`,
`INVENTORY-query-palette-261005.md`.
**Baseline, measured by this wave at `403e0fd9` (Node 24.21.0):** `npm run check` clean,
`npm run test` 1389 pass / 0 fail / 0 skipped, `npm run check:parity` 0 violations over
26 capabilities. Matches the brief's expected figures.

**Register discipline, stated up front because it governs every sentence below.** The evidence
vocabulary is `SEMANTICS.md` §13's: `asserted` is a person reading a specification and a model
together on a date; `checked` is a named gate re-deriving the claim per run, failing on drift in
both directions. Every correspondence claim in this document carries its kind, and where the kind is
`asserted` the word is `asserted`. The manifest's own ceiling sentence is the model: *"A reader who
takes `5 of 5` for conformance against the standards has read the number and not the ceiling"*
(`conformance/manifest.json:11`).

**A live sibling wave owns `conformance/` and is revising the differential design.** Everything
below is read at `403e0fd9`; where this document and that wave's output disagree about a fact, the
disagreement is a finding, and §5.4 lists the ones visible from here.

---

## Part 1 — What the engine actually is

MAGE is a modelling workbench whose kernel answers a closed set of questions over a closed set of
model types. Nothing here is generated from, parsed from, or executed against SysML v2 or KerML;
the relationship to the standards is carried as *attribution* (Part 3), and this part describes the
thing being attributed.

### 1.1 Three dialects, one registry

`ModelTypeId` is a closed union of three members — `structural-graph`, `state-machine`,
`quantitative-model` (`src/engine/model-types.ts:67`: "The list is closed; adding one is a
deliberate act"). The registry `MODEL_TYPES` (`model-types.ts:713`) carries one entry per type, and
the kernel consults it: `runTypedQuery` refuses a question whose substrate the system does not
declare, before any evaluator runs (`absentSubstrateVerdict`, `model-types.ts:1316`). That gate
fixed a live defect class the registry header records: a `latency` question over a system declaring
no quantities used to answer `holds` with a magnitude of 0 ms — "a number that looked measured and
was fabricated" (`model-types.ts:14-17`).

Each dialect interrogates its substrate through one query kind (`graph` / `behavior` / `quantity`),
pinned 1:1 by a registry test, and the published query schema's `kind` enum is compared against the
registry, "so a fourth kind cannot land in the wire format without landing here first"
(`model-types.ts:1270-1276`).

### 1.2 Nineteen question forms, derived from the declaring arrays

The count is a derivation, not a census pin. The three form vocabularies are engine-owned arrays
held in the registry *by reference* (`model-types.ts:27-30`):

- `GRAPH_FORMS` — ten: `direct`, `reachability`, `path`, `shortest-path`, `all-paths`,
  `predecessors`, `successors`, `cycles`, `components`, `containment`
  (`src/engine/types.ts:148-151`).
- `BEHAVIOR_FORMS` — six: `reach`, `invariant`, `recurrence`, `repeatable-cycle`, `deadend`,
  `transition-live` (`src/engine/types.ts:155-157`).
- `REQUIREMENT_METRICS` — three: `latency`, `cost`, `peak_memory`
  (`src/quant/requirement.ts:34`).

10 + 6 + 3 = 19. The palette inventory (`INVENTORY-query-palette-261005.md` §0-§1) measured the same
arrays and adds the discipline this document keeps throughout: **ENGINE ⊃ LANGUAGE ⊃ UI** — the
engine evaluates more than the language exposes (the LTL product layer and the past-time layer have
no query form), and the language expresses more than the UI lets a student compose (all nineteen
forms are authorable in YAML; only the graph dialect is composable from the shell). A gap in one set
must not be misdiagnosed as a gap in another.

### 1.3 The four-valued `Outcome`, and the separate `VerificationStatus`

A query's result is `Outcome = "holds" | "refuted" | "inconclusive" | "unlicensed"`
(`src/ir/types.ts:767`) — "deliberately not true/false. There is no boolean result — there is a
claim, its coverage and its evidence" (`:763-765`). Two of the four words are not propositions:
`inconclusive` says the evaluation did not settle (bounded coverage), `unlicensed` says the
purposeful models do not authorize the question. The same file splits the axes a second time:
`PropositionValue = "holds" | "refuted"` is the truth values alone, and
`EvaluationStatus = "completed" | "unlicensed" | "exhausted" | "error"` (`src/ir/types.ts:833`) is
the evaluation's fate, with `verdict` reachable only off the `completed` arm.

A **requirement** is a separate layer (`src/engine/verification.ts`): it references the positive
breach query and declares `satisfied_when: holds | refuted`; it carries no verdict and no status.
**Verification** interprets a query result against a requirement, and its vocabulary is
`VerificationStatus = "satisfied" | "violated" | "inconclusive" | "error"`
(`verification.ts:181`) — "SysML v2's verification-case result vocabulary in MAGE's spelling"
(`verification.ts:180`).

**Why `Outcome` and `VerificationStatus` deliberately share `inconclusive`.** The earlier design
(`DESIGN-v02-requirements-261004.md` §3.2) wanted five verification words — a separate
`not-verifiable` for an `unlicensed` evaluation — on the argument that folding it into
`inconclusive` sends a student to raise a budget when the remedy is to declare a relation type. The
ruling kept four words and answered the argument with a typed cause instead: one `inconclusive`,
carrying `InconclusiveCause` (`verification.ts:191-207`), a closed union **whose arms are the
remedies** — `bounded` (raise the limit), `unlicensed` (declare the model, with the refusal
sentence attached), `not-evaluated` (run the query), and `vacuous` (fix the predicate or make the
selection reachable; the arm's own comment calls it "the fourth one this union keeps apart"). One
word for "this does not settle the obligation, and it is not a breach" (`VERIFICATION_TEXT`,
`verification.ts:243`), disambiguated by a field a status word could not carry. The shared spelling
is therefore a deliberate alignment of meaning across layers, not an accident — and the differential
design's vacuity catalog names the hazard it creates for any cross-tool comparison: MAGE's
verification `inconclusive` maps to SysML's only when its cause travels with it
(`DESIGN-sysml-differential-conformance-261005.md` §6f).

### 1.4 The licensing gate

Composition is declared, never assumed (`SEMANTICS.md` §3.1). A relation type's
`pathComposition: forbidden` makes a composed answer `unlicensed` rather than false (V7;
`PATH_LICENSE`, `model-types.ts:635-639`), traversal direction is per-relation (V8), and the five
composing graph forms are exactly `GRAPH_COMPOSING` (`src/engine/types.ts:184-186`). The registry
classifies every primitive's gate as `declared` (a per-system declaration decides; the citation says
where) or `by-construction` (the type's own structure licenses it) — `PrimitiveGate`,
`model-types.ts:186-188`. The absent-substrate refusal of §1.1 is the same doctrine one level up.

### 1.5 The LTL layer and the bridge

The engine contains a full LTL checker: `ltl.ts` (parse + resolve), `ltl-automaton.ts` (generalized
Büchi compilation), `ltl-trace.ts` (satisfaction on an explicit word), and `ltl-product.ts` — the
Vardi–Wolper product over (configuration, automaton-node) pairs, Tarjan SCC with generalized
acceptance, counterexample assembly, stutter-closure at dead ends applied in the product successor
only, and verdict mapping onto the shipped four-valued `Outcome` plus `Coverage`
(`src/engine/ltl-product.ts:1-60`). A bounded search that found nothing is `inconclusive`, never
`holds` (V22).

The bridge to the shipped forms is an equation set, and its strongest member is an identity:
`invariant p ≡ G p` — "every reachable configuration lies on a trace and every trace configuration
is reachable" (`model-types.ts:858-866`); `reach p` holds exactly when `G ¬p` is refuted, with the
refuting prefix as witness (`:848-856`). `test/ltl-bridge.test.ts` holds the equations as an
executed oracle: every saved behavioural query a bridge covers is re-expressed as its formula and
decided by an independently implemented automaton-product walk, with disagreement a defect in one of
them (`test/ltl-bridge.test.ts:22`). Three of the six forms have **no** bridge, each for a stated
reason (`recurrence`: re-entry is a reachability class, not an ω-property; `transition-live`:
step-labelled propositions; `deadend`: the stutter-closure boundary — `model-types.ts:868-907`).

The whole layer is **ENGINE-only**: "a past-time question is NOT expressed here"
(`mage-query.schema.json:68`), and the LTL layer has no query form, no schema vocabulary, no
capability row (`SCOPE-v03-temporal-slice-261005.md`, quoted in the palette inventory §0).

### 1.6 The history / past-time layer

`src/engine/history.ts` answers "can `published` occur without `reviewed` having occurred first" by
*rewriting*: a Boolean history variable set on entry to the antecedent state, plus the ordinary
safety invariant — past-time compiled to safety, with the compilation disclosed on the result (V23:
"a user who is told 'no' about a model they did not write has been given a wrong answer about a
different model", `history.ts:9-12`). Engine-exported (`src/engine/index.ts:51`), schema-excluded,
UI-absent — the same ENGINE ⊃ LANGUAGE posture as the LTL layer.

### 1.7 Borrowed, extended, or ours — the census

Every construct above carries a required `semanticBasis` (`model-types.ts:119-135`), a discriminated
union with three arms: `borrowed` (names the standard, the concept, a clause slot, a fixture slot),
`extension` (ours, with a why; cannot name a standard — `standard` sits on the `borrowed` arm
alone), and `extension-grounded` (ours, standing on a cited foundation that is neither ours nor
OMG's). The per-construct answer:

| Construct | Basis | Declared at |
|---|---|---|
| structural substrate (entity, typed relation, property) | **borrowed** — KerML typed-element / relationship / feature subsets | `model-types.ts:730` |
| machine substrate (machine, state, transition) | **borrowed** — SysML v2 behavioral / state / succession subsets, "restricted realization over finite variable domains" | `model-types.ts:820` |
| quantity substrate (magnitude, dimension, unit) | **borrowed** — SysML v2 Quantities and Units library subset | `model-types.ts:975` |
| the three bindings (`appears-in`, `machine-of-entity`, `state-of-entity`) | **borrowed** — KerML binding subset, one shared basis object | `model-types.ts:1103` |
| requirement + verification | **borrowed** — SysML v2 requirement / verification-case subsets; carried by §35.4's table row, **no registry object** (see Part 3, B5) | `mage-model.schema.json` `properties.requirements` + `src/engine/verification.ts` |
| ten relational query forms | **extension** — "no standard defines [them], and a reader who goes looking for these forms in SysML v2 or KerML will not find them" | `model-types.ts:699` |
| three quantity metrics | **extension** — "the standard settles what a magnitude … means, and aggregating charges along an execution into latency, cost or peak memory is ours" | `model-types.ts:706` |
| `reach`, `invariant`, `repeatable-cycle` | **extension-grounded** — on the LTL foundation, by bridge equation | `model-types.ts:848`, `:858`, `:878` |
| `recurrence`, `deadend`, `transition-live` | **extension** — each with the recorded reason no bridge exists | `model-types.ts:868`, `:888`, `:899` |
| `executions-selected-by-behaviour` (the one composition) | **extension** — "naming SysML's analysis-case machinery to make the row look grounded would be §35.3's over-attribution" | `model-types.ts:1243-1252` |
| the LTL layer itself | **extension, externally grounded** — textbook linear temporal logic, "deliberately outside SysML and KerML" (`LTL_FOUNDATION`, `model-types.ts:693`) | §35.4 row 7 |
| pinned property / change checking, past-time device | **extension** — mechanisms with no registry object; §35.4's record is the artifact | `DESIGN-v02-semantics-261004.md` §35.5 |

The third arm is not a hedge: LTL's warrant is "stronger than 'ours' and a different one from
'borrowed from SysML'" (`model-types.ts:108-114`), and collapsing it into either neighbour would
misdescribe it in both directions.

---

## Part 2 — Syntax, compared honestly

### 2.1 The verified premise: no parsing relationship exists

The brief's claim, re-verified at `403e0fd9` rather than trusted: **nothing in `src/` parses SysML
or KerML.** Measured: a case-insensitive grep for `sysml|kerml` co-occurring with
`parse|grammar|lexer|token` over `src/**/*.ts` returns zero hits. The strings `SysML` / `KerML` do
appear — 36 times, in exactly four files (`src/engine/model-types.ts`, `src/engine/verification.ts`,
`src/ir/types.ts`, `src/learn/questions.ts`) — and every occurrence is attribution or Learn prose,
never syntax handling. That matches `SEMANTICS.md` §13.7's own history: at `f3a9991c` the strings
appeared *nowhere* under `src/`; §35.5's registry declarations are what introduced them.

Two refinements the bare premise needs:

- **The repo now contains SysML and KerML concrete syntax — hand-composed, parsed by nothing
  in-repo.** Each conformance fixture ships a `source.sysml` / `source.kerml` whose header says in
  terms: "has NOT been parsed by any tool" (all five fixtures carry the sentence; measured). The
  differential design reports that the three SysML-side Part B models **were** parsed clean by the
  Pilot Implementation on 261005 — in an uncommitted probe (`DESIGN-sysml-differential-conformance-261005.md`
  §2), so the committed headers' categorical sentence is now falsified-by-probe while remaining true
  of the committed evidence, which rests on Part A's verbatim normative excerpts. §5.4 carries this
  as a disagreement.
- **The no-parsing sentence has a planned expiry.** The differential design's §5 proposes an in-repo
  extractor over the normative `.kpar` text (plain `.sysml` source inside a zip) to join OMG's
  declared conversion factors to MAGE's `DIMENSIONS` table. When that lands, "nothing in the repo
  parses SysML" stops being true of the *gates* even while staying true of the *engine*.

So the syntax relationship is exactly what the brief says it is: **a correspondence between two
unrelated concrete syntaxes over overlapping concepts.** What that means: no translation exists in
either direction, no MAGE construct's meaning is derived from SysML text, and the pairing of the two
syntaxes is authored by hand, fixture by fixture, as evidence for a semantic claim. What it does
not mean: that the syntaxes are incomparable. The conformance corpus is the comparison, already
written, and §2.2 uses it.

### 2.2 The worked side-by-side: one guarded transition, both spellings

The corpus pairs each MAGE model with a hand-authored standard-side model. The pair chosen here is
`conformance/sysml/transition-guard-occurrence-001` — chosen because it is the only pair where both
sides carry nontrivial *behaviour* (states, transitions, a guard, an initial state), because its
MAGE side exercises machine + variable + guard + three pinned queries, and because the SysML side is
one of the three the Pilot has actually parsed (the two KerML fixtures' Part B cannot be fed to the
Pilot's headless REPL at all — measured, differential design §2). The excerpts below are abridged
from the committed files; read them whole there.

**SysML v2 textual notation** (`conformance/sysml/transition-guard-occurrence-001/source.sysml`,
Part B):

```sysml
package TransitionGuardOccurrence {
    part def Gate {
        attribute key : ScalarValues::Integer = 0;

        state gateStates {
            entry; then closed;

            state closed;
            state armed;
            state open;

            transition arm      first closed then armed;
            transition disarm   first armed  then closed;
            transition unlock   first armed if key == 1 then open;
        }
    }
}
```

**MAGE YAML** (`conformance/sysml/transition-guard-occurrence-001/model.mage.yaml`):

```yaml
machines:
  gate:
    entity: lock
    purpose:
      question: Can the gate reach open?
      represents: [arming and disarming, the key the unlock guard reads]
      omits: [wall-clock time, who arms the gate, what passes through it when open]
    initial: closed
    states:
      closed:
      armed:
      open:
    variables:
      key: { type: integer, range: [0, 1], initial: 0 }
    transitions:
      - { from: closed, to: armed, label: arm }
      - { from: armed,  to: closed, label: disarm }
      - { from: armed,  to: open,  label: unlock, requires: { key: 1 } }

queries:
  open-is-never-entered:
    kind: behavior
    quantifier: exists
    expect: refuted
    behavior:
      form: reach
      target: { gate.state: open }
```

### 2.3 Same concept, different spelling

| Concept | SysML v2 spelling | MAGE spelling |
|---|---|---|
| a state | `state closed;` | a key under `states:` |
| the initial state | `entry; then closed;` | `initial: closed` |
| a transition | `transition arm first closed then armed;` | `- { from: closed, to: armed, label: arm }` |
| a guard | `if key == 1` | `requires: { key: 1 }` |
| a state variable | `attribute key : ScalarValues::Integer = 0;` | `key: { type: integer, range: [0, 1], initial: 0 }` |
| the machine's structural referent | a `state` usage nested in `part def Gate` | `entity: lock` (`CanonMachine.entity`, the `machine-of-entity` binding) |
| a requirement | `requirement def` + `verification` machinery | `requirements:` with `statement` / `expressed_as` / `satisfied_when` |
| a quantity with unit | `attribute d : LengthValue = 2 [m]` (library types) | `quantities:` with dimension + unit against the closed `DIMENSIONS` table |

The variable row carries the sharpest semantic difference wearing a syntactic costume: SysML's
`ScalarValues::Integer` is unbounded; MAGE *requires* the finite `range:` (V17), because the
engine's answers are exhaustive walks of a finite configuration space. The MAGE fixture's own
comment notes it chose width two deliberately, so the guard is unsatisfiable by the transition
table rather than by the domain — the same modelling question, answerable in MAGE only because the
domain is declared.

### 2.4 Where MAGE has no SysML spelling

- **The entire query language.** Nineteen forms, the `quantifier` field, `expect`, the `avoid`
  predicate, `limit`, coverage on every result. SysML v2 can *express* constraints, requirement
  satisfaction, analysis cases and verification cases — but it has no author-facing palette of
  decided questions of this kind, and per the differential design its reference implementation
  cannot execute the cases it can express (§2.5).
- **`purpose:` with `question` / `represents` / `omits`** — the purposeful-reduction record
  (`SEMANTICS.md` §8). SysML has documentation comments; it has no construct whose job is to declare
  what a model deliberately does not say.
- **`expect` / `expected-results` curation, verdict-checked in CI** — the K2 warrant layer
  (`SEMANTICS.md` §13.3).
- **The transaction document** (`mage-transaction.schema.json`) — an edit vocabulary over models;
  out of scope for SysML's notation entirely.

### 2.5 Where SysML has a spelling MAGE deliberately does not

The exclusions bound the relationship as much as the inclusions, and they are enumerated in the
sources rather than inferred here:

- **The adoption-cost list, declined wholesale** (`DESIGN-v02-semantics-261004.md` §35.2): feature /
  type / specialization machinery, Definition/Usage duality (`part def` vs usage), namespaces and
  imports, multiplicity, the full expression system, the standard libraries, the textual grammar
  itself.
- **The binding exclusions, named row by row** (`KERML_BINDING_BASIS`, `model-types.ts:1082-1096`):
  no value-identity propagation, no binding of expression parameters / invocation arguments /
  feature chains, no type unification through a binding, no author-declarable connector vocabulary
  (MAGE's binding set is closed in the registry; a model cannot introduce a fourth), no end
  multiplicities.
- **The engine's own refusal list** (`agent-api.ts:848-854`, the `notSupported` census): fairness
  and liveness ("'can it reach X' is in scope, 'will it eventually reach X' is not"), instance
  binding ("multiplicity gives occupancy, never which instance holds which resource"), participant
  selection, real-valued or unbounded variables, SMT and optimization.

Each exclusion is a modelling decision with a recorded reason, which is what makes the borrowed
rows' "restricted realization" phrasing honest: the restriction is declared, not discovered.

### 2.6 Ruling on the formulation: "SysML v2 can express far more than its reference implementation can decide; our engine decides a small set of questions over a small set of dialects"

**Accurate in substance, measured — with three refinements it needs to survive a skeptic.**

The load-bearing half is now measured rather than assumed. The differential design probed the Pilot
Implementation (release `2026-08`, kernel 0.62.0) headlessly and recorded its decidable surface
(`DESIGN-sysml-differential-conformance-261005.md` §2): it parses and validates SysML v2 text,
resolves names, exposes declared and implicit structure, and evaluates literal expressions — and it
**cannot** execute state machines, cannot produce a verification-case verdict, does not reduce
quantity expressions, and does not check dimension conformance (`LengthValue = 2 [kg]` validates
silently). Of the five pinned conformance claims, *none* is fully decidable by the Pilot today. So
"expresses more than it can decide" is not a rhetorical flourish; it is the measured gap between a
language with state machines, verification cases and a quantities library in its grammar, and a
reference implementation that can type-check all of it and execute none of it.

The refinements:

1. **"Cannot decide" must not be read as zero.** The Pilot decides a real static surface —
   well-formedness, name resolution, implicit specialization structure (`%show`), literal
   arithmetic. The differential design's P1/P4 phases are built on exactly that surface. The honest
   phrasing is: the Pilot decides the structural half and none of the behavioural, verificational,
   or quantity-normalization halves.
2. **The same wedge exists inside MAGE, pointing the other way.** The palette inventory's three-set
   discipline (ENGINE ⊃ LANGUAGE ⊃ UI) says MAGE's *engine* decides more than its *language*
   exposes: the LTL product layer and the past-time layer run and are oracle-tested, and no query
   form reaches them. SysML over-expresses relative to its decider; MAGE deliberately
   under-exposes relative to its decider. The symmetric statement is sharper than the one-sided
   one, and it is the measured truth.
3. **The formulation compares a language to an implementation on one side and an implementation to
   itself on the other.** "The standard expresses more than any implementation decides" is close to
   trivially true of every rich language. The non-trivial, measured content is narrower and worth
   stating exactly: *the official reference implementation of SysML v2 cannot decide any of the five
   semantic claims MAGE pins against the standard, while MAGE decides all nineteen of its question
   forms, exhaustively or with declared bounded coverage, over its three dialects.* That sentence is
   the defensible core of the orchestrator's phrasing.

"A small set of questions over a small set of dialects" is exact: nineteen forms, three dialects,
four outcomes, every answer carrying coverage and evidence — and the smallness is the design
(`SEMANTICS.md` §1, "complexity is opt-in"), not a deficit.

---

## Part 3 — Semantics, per borrowed area

**The count, derived.** `grep -c 'kind: "borrowed"' src/engine/model-types.ts` yields 4 — the three
`MODEL_TYPES` substrate rows (`:730`, `:820`, `:975`) plus the one `KERML_BINDING_BASIS` object
(`:1103`) shared by all three `BINDINGS` rows. The fifth borrowed area carries **no registry
object**: §35.4's `requirement, verification` row lives in the schema and the verification module
(`mage-model.schema.json` `properties.requirements`; `src/engine/verification.ts`), exactly as
manifest fixture 5's `semanticBasis.owner` states (`conformance/manifest.json:151`). Four objects +
one registry-less row = **five borrowed areas**, agreeing with the differential design's §1 (which
corrected its own brief's "three").

**The evidence-rung table, as of `403e0fd9`.** Method values and the ceiling are the manifest's
(`manifest.json:5-12`); the correspondence kind is §13.7's ruling.

| Area | Fixture | Method | Correspondence kind |
|---|---|---|---|
| B1 structural substrate | `kerml/association-link-typing-001` | `spec-inspected` | **asserted** |
| B2 machine substrate | `sysml/transition-guard-occurrence-001` | `normative-artifact` | **asserted** |
| B3 quantity substrate | `sysml/quantity-unit-magnitude-001` | `normative-artifact` | **asserted** |
| B4 binding subset | `kerml/binding-connector-identity-001` | `spec-inspected` | **asserted** |
| B5 requirement + verification | `sysml/requirement-verification-verdict-001` | `normative-artifact` | **asserted** |

The manifest's derived status line: *"checked by 5 fixtures: 0 oracle-executed, 3
normative-artifact, 2 spec-inspected"* (`manifest.json:12`) — and the word "checked" there grades
the *fixtures* (each MAGE model's pinned verdicts are verdict-checked in CI, and
`test/conformance.test.ts` mutation-drives each), never the correspondence. The ceiling, in full,
because this is where it bears:

> *"No method on this list yields `checked` for the correspondence. Per section 35.5 rung 3,
> `checked` requires a gate that re-derives the claim per run, and with no runtime dependency
> nothing in CI can execute the reference implementation. The correspondence half of every row below
> is `asserted`. All five of section 35.4's rows now carry a fixture, and that is a statement about
> COUNT and not about strength: no oracle has run, two of the five rest on a sentence, and what a
> fixture changes is that the assertion carries a quoted source, a named artifact, a stated bound
> and a date. A reader who takes `5 of 5` for conformance against the standards has read the number
> and not the ceiling."* (`conformance/manifest.json:11`)

### B1 — structural substrate ← KerML typed elements, relationships, features

**Takes:** the kernel vocabulary — a MAGE entity, typed relation and property as "a restricted
realization" of KerML's typed-element / relationship / feature subsets (`model-types.ts:730-736`).
The standard is named as KerML, not SysML v2, deliberately: the registry comment rules that "naming
SysML v2 here would attribute a concept to the layer that inherits it" (`:727-729`). The pinned
claim: a relation type *classifies* its links — a question naming one relation type ranges over that
type's links and no others (Association as a Relationship-that-is-a-Classifier; KerML 1.0 §8.3.4.4.2,
§8.3.3.2.2, per the manifest).

**Does not take:** KerML's specialization machinery, feature typing in expressions, namespaces,
multiplicity — the §35.2 declined list. MAGE adds things KerML does not have on this substrate
either: per-relation `pathComposition` licensing and absence semantics are MAGE's own doctrine, and
the ten query forms over the substrate are declared `extension` outright.

**Evidence today:** `spec-inspected` — the decisive step is a specification sentence, and "a
`spec-inspected` fixture is not executable conformance" (`manifest.json:10`; §35.6a's standing
instruction). Correspondence `asserted`.

### B2 — machine substrate ← SysML v2 behavioral / state / succession

**Takes:** occupancy of a named state and declared succession — "of which a MAGE machine is a
restricted realization over finite variable domains" (`model-types.ts:820-825`). The pinned claim is
about *occurrence*: a guard conditions whether a transition occurs at all, so a declared transition
no reachable configuration can enable contributes no step (the fixture's Part A rests on the KerML
Semantic Library's `TPCGuardConstraint` invariant — the structural fact that makes the guard a
condition on occurrence rather than an annotation on an edge).

**Does not take:** triggers as first-class occurrences, effect actions as behaviors, unbounded or
real-valued variables (V17 mandates the finite domain), instance binding, participant selection
(`agent-api.ts:850-853`). MAGE's configuration-space semantics — interleaving, declared
synchronized events, multiplicity-as-occupancy (`SEMANTICS.md` §4.2-§4.4) — is MAGE's own
construction over the borrowed occupancy/succession core.

**Evidence today:** `normative-artifact` — decided by OMG's machine-readable library text, no prose
step. Correspondence `asserted`. Worth recording because it cuts the other way: this fixture's
`oracle.json` documents a **defect found in the published standard** (`source.sysml` A4: SysML v2.0
§8.3.18.9's `deriveTransitionUsageGuardExpression` selects the wrong enum literal, with prose copied
from a sibling constraint) — the close-reading method finds real defects in both directions.

### B3 — quantity substrate ← SysML v2 Quantities and Units library

**Takes:** "a magnitude that carries its dimension and unit rather than being a bare number, which
is what makes a comparison across two dimensions a category error instead of arithmetic"
(`model-types.ts:975-980`). The pinned claim: a ceiling comparison is decided by magnitudes after
unit normalization, not by the unit tokens the author wrote.

**Does not take:** the library's quantity calculus, derived quantities, measurement-reference
machinery beyond the subset the closed `DIMENSIONS` table realizes. The three metrics that
*aggregate* magnitudes (`latency`, `cost`, `peak_memory`) are declared `extension`
(`model-types.ts:706-711`): the standard settles what a magnitude means; aggregating charges along
an execution is ours.

**Evidence today:** `normative-artifact`. Correspondence `asserted` — and this is the one area where
the differential design identifies a correspondence half that a gate could hold outright: the
normative `.kpar` is plain `.sysml` text declaring conversion factors, `DIMENSIONS` restates a
subset of the same facts, and a per-run factor-by-factor comparison would make the B3 *table*
correspondence `checked` (differential design §5). Unbuilt at `403e0fd9`.

### B4 — binding subset ← KerML binding connector

**Takes:** the *assertion* that two model elements denote the same thing — "and that sentence is the
whole of the borrowing" (`model-types.ts:1076-1080`). Three closed correspondences realize it:
`appears-in` (one entity id across purposeful models — licensed by construction, the id namespace
being one namespace), `machine-of-entity` (`CanonMachine.entity`), `state-of-entity`
(`executes_in_state`). One basis object shared by all three, because they are one §35.4 row.

**Does not take** — the registry's own five-item list, reproduced in Part 2.5: value-identity
propagation, expression-parameter / feature-chain binding, type unification, author-declarable
connectors, end multiplicities (`model-types.ts:1082-1096`). The list exists because §4.5 says in
terms "do not claim that MAGE binding implements all KerML binding semantics."

**Evidence today:** `spec-inspected`. Correspondence `asserted`. Two bounds the manifest itself
states: the fixture pins `appears-in` **only** — "the substitution and its argument are in that
fixture's claim.md" (`manifest.json:192`) — so two of the three bindings have no fixture of their
own; and §35.6's rule that a fixture "says nothing about the next construct, and nothing about
completeness" applies with full force here.

### B5 — requirement + verification ← SysML v2 requirement / verification-case

**Takes:** the separation — a requirement declares an obligation and carries no verdict; a
verification *returns* a four-valued verdict computed from the deciding query and `satisfied_when`,
and stores nothing (V18). `VerificationStatus` is "SysML v2's verification-case result vocabulary in
MAGE's spelling" (`verification.ts:180`), mapping onto `VerdictKind` pass / fail / inconclusive /
error (SysML v2.0 §9.2.17.2.2, per the manifest).

**Does not take:** verification cases as model elements (there is no `verification:` key, by ruling
— "a status is derived per read and stored nowhere (V18), so recording it would change the system
the answer was about", `SEMANTICS.md` §13.7), subject/actor/objective structure, the requirements
text model. MAGE's `satisfied_when` polarity discipline — the breach query is never negated
internally — is MAGE's own doctrine layered on the borrowed separation.

**Evidence today:** `normative-artifact`. Correspondence `asserted`. The structural oddity worth a
reader's attention: **this borrowed area has no `SemanticBasis` object anywhere in the registry** —
the manifest row and the §35.4 table carry the attribution, and the construct half is "looked up
instead" in the schema and `VERIFICATION_TEXT` (`manifest.json:151`). The compiler-held rung-1
guarantee (`semanticBasis` required, so a construct cannot land unattributed) therefore does not
cover B5; its attribution is held by the manifest's partition check
(`manifest.json:182`, `owedEvidence`) and `test/conformance.test.ts`, a weaker and differently-shaped
control than the other four areas enjoy.

### The extensions, and why each is a decision rather than a gap

Nine `extension` / `extension-grounded` declarations, derived by grep: six `extension`
(`model-types.ts:699`, `:706`, `:868`, `:888`, `:899`, `:1246`) and three `extension-grounded`
(`:848`, `:858`, `:878`) — agreeing with the differential design §1. None sits inside any parity
claim against the standards: "a differential suite that accidentally tests them against the
standard would be testing an equivalence nobody asserted" (differential design §1). Each carries a
recorded *why* with the same shape: what the standard settles, where it stops, and what MAGE adds
past that point — the relational forms ("a reader who goes looking … will not find them"), the
metrics, the three bridge-less behavioural forms (each excluded from the LTL grounding for a stated
technical reason, which is §35.3's symmetry applied to a *foundation* rather than a standard:
claiming LTL for all six would be the flattering failure), and the one composition (declining to
name SysML's analysis-case machinery "to make the row look grounded").

---

## Part 4 — Where we diverge on purpose, and what it costs

### 4.1 `unlicensed` as a first-class outcome — the real divergence (and a correction to this brief)

The brief proposed "the four-valued outcome (standards tooling is not four-valued)" as a divergence.
**As stated, that is wrong at the verification layer:** SysML v2's own `VerdictKind` is four-valued
— pass / fail / inconclusive / error (SysML v2.0 §9.2.17.2.2, cited by manifest fixture 5 and
normalized 1:1 by the differential design's N4 mapping). MAGE's `VerificationStatus` is that
vocabulary in MAGE's spelling, borrowed, not divergent.

The genuine divergence sits one layer down, at the **query** outcome: `unlicensed` has no
counterpart in the standard's result vocabulary, and the doctrine behind it — composition licensed
per relation (V7), direction per relation (V8), substrate presence gating the question itself —
is MAGE's own. The differential design treats it exactly so: `unlicensed` rows are "incomparable BY
DECLARATION, reported as their own class," and folding them toward `inconclusive` would declare
agreement "exactly where MAGE declined to answer a question the standard's semantics answers — the
single most likely real divergence in the whole exercise" (§6a).

**Gain:** the fabricated-answer class dies — the 0 ms latency over an empty charge table, `deadend`
holding over an empty configuration space (`model-types.ts:12-21`); and every refusal names its
remedy (`wouldLicense`). **Cost:** incomparability with every standards tool, a mapping burden on
any future import/export, and a doctrine a SysML-literate reader must learn before verdicts make
sense to them. A standards-literate reader would call this a divergence, and the honest defense is
that it diverges from *silence*: the standard does not say what a tool should return for a question
the model's declarations do not authorize.

### 4.2 The status/verdict split — `inconclusive` that cannot accuse

The companion divergence: MAGE refuses to let a non-answer wear a truth value.
`PropositionValue` is two-valued; `EvaluationStatus` carries the non-answers; `verify` compares two
truth values and nothing else, because the same comparison over the four-valued `Outcome` "sends a
bounded search and a declined question into the accusing arm" (`verification.ts:36-43`). V22 makes
truncated coverage `inconclusive`, never `refuted`.

**Gain:** no false breach reports; the remedy-keyed `InconclusiveCause` sends the engineer to the
right fix. **Cost:** verbosity — four words plus a cause union plus coverage where a boolean would
have fit on a slide — and the homophony hazard §1.3 noted, which every cross-tool mapping must
handle cause-in-hand. Call: extension at the type level, divergence at the tooling-culture level.

### 4.3 The absence of fairness — a boundary, not a missing feature

The engine answers "can it reach X" and refuses "will it eventually reach X"
(`agent-api.ts:848-849`, under `notSupported`). The LTL layer could check liveness formulas; the
refusal is upstream of capability: no fairness assumption is ever introduced, so a liveness claim
can be **refuted** (P5 is, on both machines, with a lasso) and never affirmed. The curriculum
stages the boundary as a lesson — worker-queue's `is-the-scheduler-fair` ships as a deliberate
`unlicensed` exhibit (palette inventory §4.2).

**Gain:** every affirmative verdict the engine issues is witnessed by an exhaustive or
declared-bounded walk with no hidden assumption; students cannot receive an "eventually" that rests
on fairness they never declared. **Cost:** the response pattern `G (p → F q)` — the one
course-relevant language gap with a wanting example (palette inventory §5.1) — is affirmable never,
and the transaction-workspace example carries its spec-assigned temporal property in a test file and
entity notes because no query form can hold it. A standards-literate reader would call this a
*restriction*, not a divergence: SysML v2 fixes no fairness semantics for its tools either, and the
Pilot decides no liveness at all (measured, differential design §2) — MAGE differs by refusing
loudly where the reference implementation is silent.

### 4.4 Closed form enums — a pedagogical reduction with a declared escape

`parseQuery` admits exactly three kinds and the closed form vocabularies; everything else is a
refusal naming the legal set (`src/engine/types.ts:433-458`). The governing principle is
`SEMANTICS.md` §1: complexity is opt-in. Each form has exactly one denotation (§7.2a), the
interpretation function is compiler-total over the forms, and the palette is derivable — the
properties the UI's strongest affordance (derived labels) rests on.

**Gain:** one-denotation answers, a teachable surface, and the registry discipline of Part 1 — none
of which survives an open formula language. **Cost:** expressiveness, measured precisely by the
palette inventory: the irreducible hole is the response pattern (engine: yes; language: no), and a
spec-assigned property of a shipped example is inexpressible in the language that ships it.
Divergence or extension? Neither — it is the *subset* posture itself, the same move the borrowed
rows make ("restricted realization"), applied to MAGE's own query layer.

### 4.5 No stored verification status

SysML's verification cases are model elements; MAGE's verification is derived per read and authored
nowhere — a `verification:` key is ruled out because "recording it would change the system the
answer was about" (`SEMANTICS.md` §13.7; V18). **Gain:** a status can never go stale. **Cost:** no
verification *history* in the model, and the standard's richer case structure (objectives, subjects)
has no landing site. Call: divergence in storage discipline, borrowed in vocabulary.

---

## Part 5 — The honest state of the claim

### 5.1 What is strong: traceability, held by the compiler and the tests

Every registry construct carries a required `semanticBasis`; omission is a compile error (rung 1 —
"a new model type or question form cannot land unattributed, because the compiler will not let it,"
`model-types.ts:38-42`). Non-placeholder content is test-held (rung 2). The borrowed/extension
split is symmetric by construction: an extension *cannot* name a standard. The manifest joins every
§35.4 row to a fixture carrying a quoted specification sentence, OMG document numbers, named
machine-readable artifacts, a stated bound and a date — and its `owedEvidence` partition makes a
forgotten obligation structurally distinguishable from a discharged one (`manifest.json:182`). The
grade per fixture is *derived* from its evidence array and compared against the recorded method,
"so a mis-grade fails rather than reading as agreement between two copies" (`manifest.json:10`).

### 5.2 What is asserted: every correspondence, all five areas

**Traceability is strong; equivalence is asserted.** No method in the corpus yields `checked` for
any correspondence; zero fixtures are `oracle-executed`; two of five rest on a sentence
(`spec-inspected`). The registry's own doc comment says it plainly: the attribution "stays
`asserted` until a conformance fixture exists … nothing in CI can re-derive the standard's half"
(`model-types.ts:44-51`) — and §13.7 rules that even a fixture does not promote the word: it splits
the claim, the MAGE half becoming verdict-`checked` while "the correspondence to the standard stays
`asserted`."

### 5.3 What the design landed today would move — and what stays asserted after it

The differential design's phases, each with the rung it reaches (its §8), read against the ceiling:

- **P0** (oracle-validate the standard-side sources, transcribe): moves no `method` headline —
  corroborating evidence that each fixture's vehicle is legal SysML, which "no fixture currently
  rests on but every fixture presumes."
- **P1** (the oracle gate at pre-push): makes *standard-side validity + pinned diagnostics*
  `checked` at pre-push. **The meaning correspondence stays `asserted`** — "P1 re-derives the
  vehicle, not the claim — and the gate's own output must say that sentence, or it becomes the
  5-of-5 misreading with a JVM attached" (§8).
- **P2** (the `.kpar` ↔ `DIMENSIONS` factor join + S4/S5): **the first correspondence half to reach
  `checked`** — B3's table facts, re-derived per run against OMG's own machine-readable
  declaration. B5's `verify` becomes exhaustively pinned against a transcribed `VerdictKind` table;
  its correspondence stays `asserted`.
- **P3** (bounded-exhaustive suites against definitional oracles): makes "MAGE implements its
  claimed semantics" `checked` over the bounded spaces — the *premise* half of the equivalence,
  with the suites required to emit the two sentences separately, because reporting the first as the
  second "is this week's defect at its largest" (§4).
- **P4** (paired-mutation differential through the Pilot): correspondence-under-mutation `checked`
  where the Pilot decides — the structural halves of B1/B4, plus new fixtures honestly
  `oracle-executed` on Pilot-decidable claims.

**What stays asserted even after every phase, at today's Pilot (0.62.0):** B2's occurrence
semantics, B5's verdict computation, and B3's normalization behaviour — the Pilot has no executor,
no verification verdicts, and no quantity evaluation (measured, §2), so for those the strongest
available evidence remains the normative artifacts plus definitional oracles, and the correspondence
word remains `asserted`, version-dated against future Pilot releases.

One standing sentence changed register mid-day and the record should say so: the ceiling's
justification — "with no runtime dependency nothing in CI can execute the reference implementation"
— was §35.1's *policy* wearing a technical costume (headless execution measured at ~5 s on stock
Java; differential design §3 caveat 1, §9.3), and the author's mid-wave ruling retired the policy.
The ceiling's *verdict* stands until a gate actually re-derives a correspondence per run; its
justification text is owed a rewrite when P1 lands.

### 5.4 Disagreements between the artifacts, visible at `403e0fd9`

Reported rather than harmonized, per the brief:

1. **The registry understates the corpus — now on all five rows.** Every borrowed basis object in
   `src/engine/model-types.ts` still reads `clause: CLAUSE_OWED, fixture: null` (`:735`, `:825`,
   `:980`, `:1109`) while `conformance/manifest.json` records all five rows discharged with clause
   citations (`owed: []`, `dischargedRows`, `manifest.json:187-194`). §35.6a named this
   disagreement on 261004 for three rows ("the understatement is the safe direction and it is still
   a disagreement"); the 261005 fixtures widened it to five without the registry moving. The
   biconditional control in `test/model-types.test.ts` cannot fire while `fixture` is `null` — the
   wiring edit §35.6a calls "the next edit" is still owed, and it belongs to the sibling wave that
   owns `conformance/`.
2. **The fixture headers' "has NOT been parsed by any tool" is now falsified-by-probe for three of
   five.** All five `source.*` headers carry the sentence (measured); the differential design's §2
   records the three SysML Part B models parsing clean through the Pilot on 261005, in an
   uncommitted probe. The committed *warrant* is unchanged — each claim rests on Part A's verbatim
   excerpts — but the categorical sentence is stale, and the design itself says it "is now
   falsifiable per run."
3. **The ceiling's justification vs the mid-wave ruling** — §5.3's last paragraph. The manifest
   text is accurate about the rung and stale about the reason; the differential design §9.3 already
   owns the follow-up.
4. **B5's attribution has no compiler-held home** (Part 3, B5) — not a contradiction between
   documents, but an asymmetry between the areas that both the manifest and the differential design
   state and this document confirms at the code: four areas' attributions are type-required; the
   fifth's is manifest-carried.

### 5.5 What this brief got wrong, and what it got exactly right

- **Confirmed:** nothing in `src/` parses SysML or KerML (zero parse/grammar/lexer co-occurrences;
  the 36 mentions in four files are attribution and Learn prose) — with §2.1's two refinements
  (hand-composed standard syntax now lives in `conformance/`, and the P2 `.kpar` extractor will
  change the sentence's scope for the *gates*). Confirmed: three JSON Schemas; nineteen forms
  (derived 10+6+3); five borrowed areas (derived 4 registry objects + 1 registry-less row); the
  baseline figures, exactly.
- **Wrong, Part-4 candidate list:** "the four-valued outcome (standards tooling is not
  four-valued)" — SysML v2's `VerdictKind` is itself four-valued (§4.1); the real divergences are
  `unlicensed` at the query layer and the status/verdict split.
- **Mis-citation:** "`SEMANTICS.md` §13, §35.4–§35.6a" — §35 lives in
  `DESIGN-v02-semantics-261004.md`; `SEMANTICS.md` ends at §13.7 (which cites §35 as its
  authority).
- **Under-specified:** "the remedy-keyed `InconclusiveCause`" — the union has four arms, not the
  three the module header's older prose implies; `vacuous` is the fourth (`verification.ts:191-207`).
- **Infrastructure premise:** the worktree arrived without the three `node_modules` symlinks the
  dispatch ritual owes (first `npm run check` failed with `tsc: command not found`); fixed by
  symlinking to the main checkout per the repo's own procedure, no `npm install`.
- **The Part-2 formulation:** accurate in substance, measured — adopted with the three refinements
  of §2.6, of which the sharpest is the symmetric statement: SysML over-expresses relative to its
  reference decider; MAGE deliberately under-exposes relative to its own.

---

*Prose only; no code, schema, fixture, or manifest was touched. Gates at this HEAD: check clean,
1389 / 0 / 0, parity 0 over 26 — measured before writing and unchanged by it, since nothing moved.*
