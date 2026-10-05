# The SysML v2 / KerML surface subset — Phase 1: the supported language, defined before any parser (261005)

**Status: DESIGN. No code, schema, example, or fixture changed by this wave. STOP-FOR-REVIEW
artifact — Phase 2 (the parser spike) does not start until this is reviewed.**

**Authority:** the author's architecture brief (23 sections, reproduced in the dispatch record);
`WRITEUP-engine-vs-sysml-kerml-261005.md` (the per-area borrowings and exclusions this subset
starts from); `DESIGN-sysml-differential-conformance-261005.md` (the oracle's measured decidable
surface); `INVENTORY-query-palette-261005.md` (the nineteen forms and ENGINE ⊃ LANGUAGE ⊃ UI);
`src/engine/model-types.ts` (the registry); `SEMANTICS.md`; `mage-model.schema.json`; the six
shipped examples.

**Baseline, measured by this wave at `19cbd9a6d` (Node 24.21.0):** `npm run check` clean,
`npm run test` 1389 pass / 0 fail / 0 skipped, `npm run check:parity` 0 violations over 26
capabilities. Matches the brief's expected figures.

**The governing principle, which every section below applies:** *standard syntax, standard
meaning, restricted coverage; MAGE questions and analyses.* Where this document takes a SysML or
KerML construct, it takes the standard's meaning for it. Where MAGE supplies the meaning —
questions, outcomes, licensing, purpose — the construct stays MAGE and is not dressed in standard
costume. Where the two would blur, the subset refuses rather than approximates.

**Register discipline:** `asserted` is a person reading the specification and a model together on
a date; `checked` is a named gate re-deriving a claim per run. Every fragment of standard syntax
in this document was run through the SysML v2 Pilot Implementation (release 2026-08, kernel
0.62.0, Temurin 21, full `sysml.library` loaded — 94 files) on 2026-10-05 via the
`FixtureValidateDriver` seam. That makes each fragment's *validity* oracle-verified. It does not
make any *correspondence* checked; §9 keeps those words apart.

## §0a. Oracle receipts — every fragment in this document, and what the oracle said

| # | File (session scratch, `subset-probes/`) | Contents | Verdict |
|---|---|---|---|
| 0 | committed fixture `conformance/sysml/transition-guard-occurrence-001/source.sysml` | driver smoke test | parseErrors=0, errors=0, warnings=0 |
| 1 | `p1-structural.sysml` (v1) | enum def with quoted `'public'`, part defs, connection defs with `[0..*]` ends, connection usages | 0 errors, **4 warnings** — "End feature must have multiplicity 1" |
| 1′ | `p1-structural.sysml` (v2) | same, ends retyped `[1]` | **0 / 0** |
| 2 | `p2-behavioral.sysml` | `exhibit state`, entry/then, 7 named transitions, `if` guards, `do action { assign … := …; }` effect, Boolean variable | **0 / 0** |
| 3 | `p3-quantitative.sysml` | `<KiB> kibibyte` assembled from `SIPrefixes::kibi` + `SI::B` via `ConversionByPrefix`, quantity attributes `24 [KiB]`, package-level budget attribute, bare `requirement` with doc | **0 / 0** |
| 4 | `p4-edges.sysml` | `metadata def` + `@`-annotation, exact multiplicity `Buffer[4]`, finite-domain `constraint`, integer guard `if retry_count < 3`, `assign retry_count := retry_count + 1` | **0 / 0** |
| 5 | `transaction-workspace.sysml` (v1) | full translation, identity package named `Parts` | **4 errors** — own package shadowed the standard library's `Parts::Part` |
| 5′ | `transaction-workspace.sysml` (v2) | identity package renamed `Entities`, library `Parts::Part` imported for heterogeneous ends | **0 / 0** (§5.1) |
| 6 | `embedded-sensor-node.sysml` | full translation: two graph-model packages, nine quantity attributes, KiB unit, budget, requirement | **0 / 0** (§5.2) |
| 7 | `neg-control.sysml` | deliberate garbage (`part broken : NoSuchDef;`, stray `transition`) | **3 errors** — the gate is live, not a rubber stamp |
| 8 | `kg-weakness.sysml` | `attribute bad : LengthValue = 2 [kg]` | **0 / 0** — the brief's weak-oracle premise re-verified at 0.62.0: the Pilot does not check dimension conformance |
| 9 | `neighbors.sysml` | five valid-SysML-outside-subset constructs: unbounded `Integer`, `[0..*]`, `calc def`, user-level `specializes`, `accept` trigger | **0 / 0** — all five are *valid SysML*, which is exactly the diagnostic class they must get (§6) |
| 10 | `p5-interval.sysml` | uninitialized quantity attribute + interval constraint `100 [ms] <= x and x <= 500 [ms]`; `<ms>` assembled per the quantity fixture's A5 pattern | **0 / 0** |

Measured cost: 1.9–3.7 s per run warm (first run 8.1 s). Eleven runs, all transcribed above; no
fragment below appears that was not in one of these files.

---

## §1. Four representations, four diagnostic classes

The pipeline is: **source text → standard AST → checked MAGE projection → executable MAGE IR**,
and the four are kept separate by design, not by exhortation:

1. **Source text.** `.sysml` (and, where the structural subset is spelled in KerML, `.kerml`)
   with spans preserved end-to-end. The formatter and the editor operate here.
2. **Standard-language AST.** The parse of the *standard grammar subset* — it contains packages,
   imports, definitions, usages, transitions, constraints, literals. It contains **no** MAGE
   vocabulary: no outcome, no licensing, no purpose, no substrate id. A construct the standard
   admits and MAGE refuses still parses into this AST; refusal happens at the next boundary.
3. **Checked MAGE projection.** The semantic boundary. It maps each supported AST construct onto
   the three substrates (`structural-graph`, `state-machine`, `quantitative-model` — the closed
   `ModelTypeId` union, `src/engine/model-types.ts:67`), joins the adjacent MAGE analysis
   document (§2), and refuses everything else with a construct-specific message (§6). No fourth
   substrate is added; the projection targets the registry as it stands.
4. **Executable MAGE IR.** Unchanged. The engines (`src/engine/`, `src/quant/`) see canonical IR
   and nothing of the source syntax. Round-trip equivalence is defined at this level (§7).

The four diagnostic classes fall out of the boundaries:

| Class | Where it fires | Example message shape |
|---|---|---|
| D1 syntactically invalid | parser | "expected `then` after transition source" (+ span) |
| D2 valid SysML/KerML, outside the supported subset | projection, by construct | "`calc def` is valid SysML v2 but outside the MAGE executable subset; totals are computed by MAGE's quantity analyses, not authored" |
| D3 supported but semantically invalid in context | projection, by rule | "transition target `comitted` names no declared state" |
| D4 supported and projectable | — | projected; spans carried into the IR's source map |

D2 is the projection analogue of `unlicensed`, and its messages follow the author's §5 pattern:
name the standard meaning, name MAGE's bound, name the repair. The catalog is §6.

---

## §2. Three closed dialects in one standard surface — the make-or-break ruling

MAGE's power is separate purposeful models with distinct, declared omissions, bound by identity.
A `.sysml` file naturally wants to be one model. The brief asked for this answered first and
concretely; here is the answer, derived from the two full translations in §5 rather than from
preference.

### 2.1 The architecture: a union surface, carved by the analysis document

**Ruling: Option A — adjacent documents.** `transaction-workspace.sysml` describes the system;
`transaction-workspace.mage.yaml` (the current format, slimmed) declares purpose, membership,
licensing, questions, and analysis configuration. The author's own reason survives contact with
the translations and is strengthened by them: *the system description is reusable outside MAGE;
the questions are MAGE.* Everything that moved to `.sysml` in §5 is intelligible to any SysML
tool; everything that stayed in `.mage.yaml` would have been noise to one.

**The package shape that makes three-in-one work** (validated in §5, both translations):

```
package '<system-id>' {
    package Domains        { enum defs — the ordered value domains }
    package Entities       { entity-type part defs; one part usage per entity,
                             with its property attributes, its quantity
                             attributes, and its exhibited state machines }
    package RelationTypes  { one connection def per relation type }
    package '<graph-model-id>' {      // one package PER graph purposeful model
        private import Entities::'<member>';   // one import PER member — explicit
        … connection usages — the model's relations …
    }
    requirement '<requirement-id>' { doc /* statement */ }
}
```

Three design facts carry the separation:

- **Shared identity is the qualified name, by construction.** Every entity is declared once, in
  `Entities`. A purposeful model *imports* its members, one `private import` per member. The
  KerML meaning used is exactly namespace membership and import — resolution of a name to a
  single declared element. `appears-in` needs no binding connector at all: two models that
  import `Entities::'transaction-engine'` denote the same element because the standard's name
  resolution says so. (This retires the hand-rolled binding-connector spelling that fixture
  `binding-connector-identity-001` attempted — the fixture the sibling wave found to be illegal
  KerML. The subset borrows identity from the namespace, where it is a theorem, not from a
  connector, where we spelled it wrong.)
- **Membership is explicit, so omission is visible.** The wildcard `private import Entities::*;`
  into a purposeful-model package is **refused by the subset** (D2): a purposeful model's member
  list is a modeling decision, and an import list the reader can see is this architecture's
  spelling of MAGE's `entities:` list. `sensor-dataflow` imports four of nine entities (§5.2);
  the five absent imports are five visible omissions.
- **Machines nest where their binding lives.** `machine-of-entity` is spelled `exhibit state`
  nested in the part usage — the standard's own meaning (a part exhibiting a behavior), carried
  by the standard's own construct. The behavioral purposeful model is the exhibited state usage;
  it needs no package of its own, and two machines on one entity (worker-queue's `job`) are two
  `exhibit state` usages in one part.

**What the union surface honestly costs, stated rather than hidden.** The `.sysml` file is a
*union*: a reader of `Entities` sees the `sram` attribute on `'sensor-driver'` even when reading
on behalf of the dataflow model, whose MAGE purpose omits sizes. The purposeful reductions are
projections carved by the analysis document, not disjoint source regions. Three mitigations keep
this from collapsing the dialects: membership stays explicit (above); the quantity attributes
project into the *quantitative* substrate only, so the projected `sensor-dataflow` graph model
still carries no magnitude and a size question against it still refuses; and the per-model
`purpose`/`omits` blocks remain in the analysis document, checked against the *projected* model's
vocabulary (V24's discipline survives the migration unchanged). The alternative — strict package
partition with entities duplicated or re-declared per model — was rejected because it breaks the
one-namespace identity theorem that makes `appears-in` free.

### 2.2 What stays in the MAGE analysis document, exhaustively

Everything whose meaning MAGE supplies. Keyed by qualified name into the `.sysml` sibling:

| Stays `.mage.yaml` | Why it is MAGE, not standard |
|---|---|
| `purpose:` per model/machine (`question` / `represents` / `omits`) | the purposeful-reduction record; SysML has doc comments, no construct whose job is declaring what a model deliberately does not say |
| model membership need not be restated (derived from imports) but may pin labels/order | presentation |
| `composition.path: allowed\|forbidden` + `absence:` text per relation type | V7/V8 licensing doctrine — MAGE's own; no standard counterpart |
| `accounting:` (basis), `residency:` / `when:` per quantity | the charge semantics behind `latency` / `cost` / `peak_memory` — the metrics are declared `extension` (`model-types.ts:706`) |
| `events:` (sync labels + participants) | MAGE's synchronized-step semantics; §4.5 explains why SysML `accept` must NOT spell it |
| `executes_in_state` (`state-of-entity`) | kept MAGE metadata this wave; §3.4 records the candidate standard spellings and why both are declined |
| `queries:` — all nineteen forms, quantifiers, `avoid`, `limit`, `within` | the question language; author's §7 — it does not go looking like SysML |
| `requirements:` **joins** — `expressed_as`, `satisfied_when` | the deciding-query reference and polarity are MAGE's verification discipline; the obligation *statement* lives in the `.sysml` `requirement` (§3.5) |
| `views:`, `notes:`, `provenance:`, saved-question curation | workbench presentation and record |

Option B — `metadata def` + `@`-annotations — is *real*: the mechanism exists and validates
(receipt 4; the author's "check the language" instruction is discharged, not assumed). It is
declined anyway, for the reusability argument and one more: an annotation-carried purpose block
turns every MAGE schema evolution into a standard-surface churn, and the pair of files keeps the
two change rates apart. One narrow future exception is left open: if the analysis document ever
needs to *point into* the model (it does — qualified names), nothing further is required; names
suffice.

---

## §3. The construct table

Columns per the author's §3. "Standard semantic meaning used" names what we take; "MAGE
projection" names where it lands; "Unsupported nearby features" is §5's refusal discipline made
per-row (each entry is valid SysML/KerML the projection refuses with a D2 message). Every
"Accepted syntax" cell is drawn from an oracle-validated fragment (§0a).

### 3.1 Structural (→ `structural-graph` substrate; KerML-rooted, SysML v2 spelling)

The registry's borrowing for this substrate names KerML — typed-element / relationship / feature
subsets (`model-types.ts:730`). The accepted *concrete syntax* is SysML v2's, because the Pilot's
headless path validates `.sysml` and because SysML part/connection usages reach the same kernel
semantics (Association as a Relationship-that-is-a-Classifier; each connection def specializes
`Links::BinaryLink` implicitly). The KerML grounding is unchanged; the spelling is the SysML
layer's.

| MAGE need | SysML/KerML construct | Accepted syntax | Standard semantic meaning used | MAGE projection | Unsupported nearby features |
|---|---|---|---|---|---|
| entity identity | element declaration + unrestricted name | `part 'transaction-engine' : Service;` | a named element; the qualified name resolves to exactly one declaration | entity id (quoted form preserves MAGE kebab-case ids verbatim — no name map) | aliasing (`alias`), element IDs, `#` metadata-shorthand names |
| entity type | `part def` | `part def Service;` | a definition classifying its usages | `CanonEntity.type` | `part def` bodies with behavior/ports; abstract defs; user-level `specializes` between entity types (§4.3) |
| entity property | typed `attribute` on the def + redefinition on the usage | `attribute permits : Sensitivity;` / on usage: `attribute redefines permits = Sensitivity::internal;` | feature typing + redefinition with a bound value | property bag entry with domain | derived attributes, defaults with expressions, feature chains |
| ordered value domain | `enum def` | `enum def Sensitivity { 'public'; internal; restricted; }` | an enumeration definition with its declared literals | `ordered-enum` domain; **the order is the declaration order** | SysML does **not** define `<` over enum literals — the V20 ordered-comparison semantics is MAGE's reading of declaration order, and the projection says so in provenance; enum literals with bodies/values |
| typed relationship (relation type) | `connection def` with two typed ends | `connection def OwnsBuffer { end source : Firmware[1]; end target : Buffer[1]; }` | an association: a Relationship that is a Classifier; it classifies its links; each link has one source and one target participant (`Links::BinaryLink`) | relation type; B1's pinned claim (a question naming one type ranges over that type's links and no others) transfers intact | end multiplicities other than `[1]` (the validator itself warns on anything else — receipt 1); n-ary connections; connection defs with owned behavior |
| source/target typing | end feature types | ends typed by entity-type defs where the MAGE relation is uniform; by imported library `Parts::Part` where heterogeneous (`hands_to`: Service→{Service, Store}) | end feature typing restricts participants | projection checks each usage's endpoints against the declared end types (D3 on violation) | — (MAGE today declares no endpoint typing at all; this is a small, honest *gain* in commitment, chosen because it is the standard's own discipline for association ends) |
| relation instance | `connection` usage | `connection 'radio-owns-telemetry-queue' : OwnsBuffer connect 'radio-stack' to 'telemetry-queue';` | a link of the named association between the two named usages | a relation row (id, from, to, type) | unnamed connections (id is mandatory for MAGE identity); `connect` with feature chains or indexed ends; binding/flow connection usages |
| per-relation path-composition policy | — none; stays MAGE | `.mage.yaml` `composition.path` | — | V7 licensing | **deliberately not** spelled with any standard construct; nothing in SysML carries "composition of this association is a licensed/unlicensed question" |
| containment | — not represented structurally this wave | — | — | the `containment` graph form keeps operating on declared relations | nested part usages (composite structure) are **refused inside `Entities`** except quantity attributes and `exhibit state` — a nested part is valid SysML whose containment semantics MAGE does not take this wave; revisit when a shipped model wants structural containment |
| shared identity across models | namespace membership + `private import` | one `private import Entities::'<id>';` per member, per model package | name resolution: one declaration, many references | `appears-in` — by construction (§2.1) | wildcard import into model packages (refused for explicit membership); `public import` / re-export; alias chains |

### 3.2 Behavior (→ `state-machine` substrate; SysML v2 state/succession)

| MAGE need | SysML/KerML construct | Accepted syntax | Standard semantic meaning used | MAGE projection | Unsupported nearby features |
|---|---|---|---|---|---|
| machine bound to its entity | `exhibit state` in the part usage | `part 'transaction-engine' : Service { exhibit state 'transaction-lifecycle' { … } }` | the part exhibits this state-based behavior | `CanonMachine` + `machine-of-entity` binding, by construction | free-standing `state def` reused by several parts (refused this wave: MAGE machines are per-entity); `perform action` |
| state | `state` usage | `state proposed;` | an exclusive state of the enclosing state usage | machine state | nested/composite states, parallel regions, entry/exit actions on states |
| initial state | empty entry transition | `entry; then idle;` | the entry of the state usage targets `idle` first | `initial:` | entry actions with behavior |
| transition | named `transition` | `transition commit first valid then committed;` | succession: source state, target state; the transition's occurrence takes the machine from one to the other | transition row; the name is MAGE's `label` | unnamed transitions (MAGE labels are load-bearing — sync joins and `transition-live` name them); `else` branches |
| guard | `if` on the transition | `if base_current` / `if retry_count < 3` | a guard conditions whether the transition occurs at all — B2's pinned claim (`TPCGuardConstraint`), taken unchanged | `requires:` — expression grammar bounded to MAGE's closed guard grammar (comparisons of one variable against a literal, conjunctions) | arbitrary boolean expressions over feature chains, quantified expressions, time expressions |
| finite variable — boolean | typed `attribute` on the part | `attribute base_current : Boolean = true;` | feature typed by `ScalarValues::Boolean`, bound initial value | boolean variable, initial | — (Boolean is finite by construction) |
| finite variable — bounded integer | `attribute` + sibling domain `constraint` | `attribute retry_count : Integer = 0;` with `constraint retryCountDomain { 0 <= retry_count and retry_count <= 3 }` | an invariant constraining the attribute's value to the interval — standard constraint semantics, nothing invented | integer variable with `range: [0, 3]`; the constraint pattern `lo <= v and v <= hi` is the **one recognized domain shape**; an `Integer` attribute in a machine-bearing part with no domain constraint is a D2 refusal (the author's §5 example, verbatim in spirit: declare a finite domain or remove the variable from the executable model) | reals, unbounded integers, strings as variables |
| finite variable — enumerated | `attribute` typed by an `enum def` | `attribute mode : Mode;` | enum-typed feature; finite by construction | enum-domained variable | — |
| effect (variable assignment) | `do action { assign … }` | `do action { assign base_current := false; }` / `assign retry_count := retry_count + 1;` | an effect action of the transition, restricted to assignment | `effects:` — RHS bounded to literals and the `v + 1` / `v - 1` forms MAGE's effect grammar admits | **any other effect behavior** — `send`, `perform`, action chains: valid SysML, refused with "effects are valid SysML v2 but outside the current MAGE executable subset" |
| trigger | — none | — | — | — | `accept <Signal>` triggers (receipt 9 validates one): **refused**. MAGE transitions occur by selection, not by event reception; see §4.5 for why sync does not borrow this |
| synchronization | — stays MAGE | transitions in two machines carry the **same name**; `.mage.yaml` `events:` declares the label + participants | — (names only) | synchronized step per `SEMANTICS.md` §4.2–4.4 | spelling sync as shared `accept` triggers would give standard syntax a CSP-handshake meaning the standard does not assign — the inverse of the never-approximate rule — so it is **declined**, documented, not approximated |
| state occupancy / transition occurrence | the standard's own semantics of state usages and successions | — | occupancy of a named state; declared succession | configuration space, exhaustive walks — MAGE's construction over the borrowed core, as today | fairness, real time, history pseudostates |

### 3.3 Quantities (→ `quantitative-model` substrate; SysML v2 Quantities and Units)

| MAGE need | SysML/KerML construct | Accepted syntax | Standard semantic meaning used | MAGE projection | Unsupported nearby features |
|---|---|---|---|---|---|
| magnitude + dimension + unit | library quantity value types + `[unit]` literal | `attribute sram : StorageCapacityValue = 32 [KiB];` on the part usage | a quantity value is a number paired with exactly one measurement reference of its dimension (`ISQBase` A1 structure) — a comparison is between magnitudes, not numerals | a quantity targeting the owning entity (`target: entity:<id>` derived from nesting) | the quantity calculus (`QuantityCalculations`), derived quantities, vector/tensor quantities, `DimensionOneValue` ratios |
| dimension vocabulary | the library's value types | `DurationValue` (duration), `StorageCapacityValue` (memory), currency pending (see right) | the library's dimension assignments | the closed `DIMENSIONS` table rows duration/memory; **`cost` has no library landing** — ISO 80000 declares no currency dimension, and no shipped example declares a money quantity (inventory §4.3), so cost quantities stay `.mage.yaml`-declared until a shipped model forces the decision | any other library dimension (Length, Mass, …) — D2 until `DIMENSIONS` grows deliberately |
| unit normalization / conversion | declared units + `ConversionByPrefix` | `attribute <ms> millisecond : DurationUnit { :>> unitConversion : ConversionByPrefix { :>> prefix = milli; :>> referenceUnit = s; } }` — the quantity fixture's A5 pattern, oracle-validated here | the standard's own conversion mechanism: a prefixed unit's factor derives from its prefix's declared `conversionFactor` | the conversion row in `DIMENSIONS`; the §9 `.kpar` gate is what joins the two | user-defined non-prefix conversions, offset (affine) units, `isExact = false` |
| **the KiB finding** | `SIPrefixes::kibi` (factor 1024) + `SI::B` (byte) | `attribute <KiB> kibibyte : StorageCapacityUnit { … prefix = kibi; referenceUnit = B; }` | IEC binary prefixes are **in the normative library** | this *heals a recorded defect*: the shipped `DIMENSIONS` memory table spells kibibytes `KB` and the sensor-node header spends ten lines warning readers the token is binary (`examples/embedded-sensor-node/system.mage.yaml:29-37`). The standard surface writes `256 [KiB]` and means exactly 262144 bytes by OMG's own declared factor | — |
| capacity / budget | package-level attribute in the model package | `attribute 'sram-budget' : StorageCapacityValue = 256 [KiB];` | an attribute of the package (a quantity of the model, owned by no part) | `target: model:<model-id>` — the `within:`-nameable ceiling, charged by no basis | budgets as `constraint` assertions (the deciding comparison is MAGE's analysis, not a model invariant — writing it as a constraint would move the verdict into the model, which V18 forbids for the same reason verification status is stored nowhere) |
| per-entity charge | nested quantity attribute (above) | — | — | charge; `residency:` / `when:` / `accounting.basis` stay `.mage.yaml` — they are the metrics' charge semantics, and the metrics are extensions | — |
| interval-valued quantity | uninitialized attribute + interval constraint | `attribute 'gateway-latency' : DurationValue;` + `constraint { 100 [ms] <= 'gateway-latency' and 'gateway-latency' <= 500 [ms] }` | an invariant bounding the value — exactly what MAGE's `range:` means | `range: [100 ms, 500 ms]`; same recognized constraint shape as finite domains (one pattern, two uses) | arbitrary constraints over quantities; distributions |
| aggregation (`latency`, `cost`, `peak_memory`) | — none, by declaration | — | the standard settles what a magnitude means; aggregating charges along an execution is MAGE's (`model-types.ts:706`) | the three metrics, unchanged | do **not** reach for SysML analysis cases to hold a metric (author §7) |

### 3.4 Bindings (KerML identity subset)

The current borrowing is "the assertion that two elements denote the same thing — that sentence
is the whole of the borrowing" (`model-types.ts:1076-1080`). The subset *narrows the spelling*
while keeping exactly that meaning:

| MAGE binding | Ruling | Spelling | Why |
|---|---|---|---|
| `appears-in` | **by construction** | one declaration in `Entities`, per-member imports | name resolution IS the identity assertion; no connector needed, nothing to get wrong (the shipped binding fixture's connector spelling is the one the oracle rejected — 8 errors, sibling wave's finding) |
| `machine-of-entity` | **by construction** | `exhibit state` nesting | the standard's own part-exhibits-behavior meaning, which is *stronger* grounding than a hand-authored connector |
| `state-of-entity` (`executes_in_state`) | **stays MAGE metadata** | `.mage.yaml` property, qualified `machine.state` reference, V38-checked as today | two standard spellings were considered and declined: a `ref` feature chaining into the state usage drags in feature-chain reference semantics (an explicit exclusion, `model-types.ts:1082-1096`); a binding connector between an entity property and a state usage asserts *identity* between two things that are not the same thing — it would be standard syntax with the wrong standard meaning. Refusing both is the §5 rule applied to ourselves |

Excluded KerML binding machinery — value propagation, expression-parameter and feature-chain
binding, type unification, author-declared connectors, end multiplicities — remains excluded,
now with less surface area: the subset accepts **no** binding-connector syntax at all. D2
message for one: "This binding requires value propagation. MAGE currently supports identity
correspondence only — and spells it through the namespace, not through connectors."

### 3.5 Requirements (SysML v2 requirement, smallest viable)

| MAGE need | SysML/KerML construct | Accepted syntax | Standard semantic meaning used | MAGE projection | Unsupported nearby features |
|---|---|---|---|---|---|
| obligation statement | bare `requirement` usage + `doc` | `requirement 'no-stale-base-commit' { doc /* A change never commits against a base that is no longer the one the workspace serves. */ }` | a requirement: a named obligation the model is accountable to | `requirements.<id>.statement` | `requirement def` / usage split; `subject`, `actor`, `objective`; `require constraint` bodies (the deciding predicate belongs to the query, not the requirement); nested requirement decomposition |
| deciding-query join + polarity | — stays MAGE | `.mage.yaml`: `expressed_as: <query-id>`, `satisfied_when: holds\|refuted` | — | V18 discipline unchanged: the requirement stores no verdict anywhere in either file; verification derives per read | **verification cases** (`verify`, verification case defs) — SysML can model them; MAGE's ruling that a stored status "would change the system the answer was about" (`SEMANTICS.md` §13.7) forbids importing them, and `VerificationStatus` already borrows the *vocabulary* (`verification.ts:180`) without the model elements |

### 3.6 MAGE metadata — not dressed as standard

Per §2.2. The one annotation mechanism probe (receipt 4) stands as evidence Option B was checked
against the language rather than assumed; the purpose block, the question language, and the
licensing doctrine remain MAGE constructs in the MAGE document. The author's §7 is enforced
structurally: the analysis document's `queries:` block has no `.sysml` counterpart at all, so
there is nothing for a student or an agent to mistake for SysML analysis machinery.

---

## §4. Exclusions revisited, one at a time (author §3: "revisit … individually")

### 4.1 Multiplicity — ADMIT, in a restricted exact form. The author's prediction is right, with a boundary.

The embedded-memory probe, asked progressively, against today's model and against the subset:

| Probe question | Today | With restricted multiplicity |
|---|---|---|
| a 256 KiB SRAM capacity? | yes (`model:` quantity) | yes (`attribute 'sram-budget' = 256 [KiB]`) |
| one buffer consumes 32 KiB? | yes | yes (nested attribute) |
| **4 such buffers?** | no — four copy-pasted entities, or fold the ×4 into the scalar (the shipped model folds: "32 KB is 64 records of 512 B", a comment, invisible to the engine) | yes: `part 'telemetry-buffers' : TelemetryBuffer[4] { attribute sram : StorageCapacityValue = 8 [KiB]; }` — validated syntax (receipt 4) |
| total static allocation? | yes (resident sum) | yes — the cardinality **scales the charge**: 4 × 8 KiB enters the resident sum |
| peak runtime allocation? | refused until lifetimes are modeled | **still refused** — multiplicity adds cardinality, not lifetime; the refusal §10 designs fires unchanged |

The admitted form: **exact multiplicity `[n]` on an entity usage, projecting to charge scaling
in the quantitative substrate only.** The entity enters the structural substrate *once*, as one
identity — not as n instances — which keeps V14's discipline (multiplicity is occupancy, never
binding) intact and keeps instance selection excluded exactly as `agent-api.ts`'s `notSupported`
census states. Refused neighbors, each D2: ranges `[0..4]`, unbounded `[0..*]` (receipt 9
validates it as legal SysML — the message names the repair: "declare an exact count; MAGE
charges by cardinality and cannot charge an unbounded one"), end multiplicities beyond `[1]`,
multiplicity on relation usages.

The standard meaning taken is small and real: the usage's multiplicity declares how many of the
thing there are. The last probe row is the architectural test passing: the model is genuinely
purposeful — cardinality earns its cost for totals, and the peak question still waits for the
lifetime distinction rather than being smuggled in (§10).

### 4.2 Namespaces — partially admitted, by construction, and bounded

The §2.1 architecture *is* namespace machinery: nested packages, qualified names, per-member
private imports, quoted unrestricted names. That is admitted deliberately — it is what buys
identity-by-construction — and bounded there: no aliasing, no public re-export, no visibility
vocabulary beyond `private import`, no nested user packages beyond the fixed four-slot shape, and
no wildcard member-import into model packages. The declined remainder stays declined not because
the grammar lacks it but because every admitted namespace feature must serve the identity
theorem, and none of the rest does.

### 4.3 Specialization — keep excluded at user level; name the implicit layer honestly

User-written `specializes` between entity types stays out (receipt 9 confirms it is valid SysML;
D2: "entity types are flat in MAGE; declare a property or a relation instead"). But the document
must say what the Pilot made visible: every `part def` *implicitly* specializes the library's
`Parts::Part`, and every `connection def` implicitly specializes `Links::BinaryLink` — the
subset *rides on* implicit specialization without exposing it. That is library plumbing, free
and standard; the exclusion is of specialization as an *authoring* device, where the flat
entity-type model is a MAGE modeling decision a hierarchy would silently dissolve.

### 4.4 Feature typing in expressions / the expression sublanguage — keep excluded, with two carve-ins

The full SysML expression system stays out. Two closed patterns are carved in because shipped
models need them and their standard meaning is exactly MAGE's: the guard grammar
(comparisons + conjunction, §3.2) and the recognized domain/interval constraint shape
(`lo <= v and v <= hi`, §3.2/§3.3). Both are *subsets of the standard expression grammar* —
every accepted token sequence is standard-legal (oracle-validated) and traceable to the standard
operator meanings; nothing beyond the pattern parses into the projection.

### 4.5 Triggers, effects, synchronization — the one place we refuse a plausible standard spelling

`accept` triggers are valid SysML (receipt 9) and are refused: MAGE has no first-class trigger
occurrences, and — the sharper reason — spelling MAGE's CSP-style synchronized step as paired
`accept`s of a shared signal would assign standard syntax a meaning (atomic multi-machine
handshake) the standard assigns differently (asynchronous event reception). That is the §5 rule
in reverse: never make legal SysML mean something it does not. Sync therefore stays in the MAGE
document (`events:` with participants), joined to transitions by name. Effects are admitted only
as `assign` actions (§3.2); every other effect behavior refuses with the author's own sentence.

---

## §5. The three representative translations, side by side

Both `.sysml` texts below validated **0 errors / 0 warnings** against the Pilot with the full
standard library loaded (receipts 5′, 6). The MAGE sides are the shipped files, quoted in
excerpt; the proposed analysis-document sketches show exactly what remains MAGE.

### 5.1 Transaction Workspace — structural + state-machine (the Risk-1 probe)

**Shipped MAGE** (`examples/transaction-workspace/system.mage.yaml`, excerpted):

```yaml
entities:
  transaction-engine:
    type: service
  validator:
    type: service
    properties:
      executes_in_state: transaction-lifecycle.proposed
machines:
  transaction-lifecycle:
    entity: transaction-engine
    initial: idle
    states: { idle: …, proposed: …, valid: …, committed: …, refused: … }
    variables:
      base_current: { type: boolean, initial: true }
    transitions:
      - { from: idle,     to: proposed,  label: propose }
      - { from: proposed, to: proposed,  label: base_advances,
          requires: { base_current: true }, effects: { base_current: "false" } }
      - { from: proposed, to: valid,     label: validate }
      - { from: proposed, to: refused,   label: reject }
      - { from: valid,    to: valid,     label: await_adoption }
      - { from: valid,    to: committed, label: commit,       requires: { base_current: true } }
      - { from: valid,    to: refused,   label: refuse_stale, requires: { base_current: false } }
models:
  change-pipeline:
    type: graph
    entities: [proposer, transaction-engine, validator, workspace-store, audit-log]
    relations:
      - { id: proposer-submits-to-engine,   from: proposer,           to: transaction-engine, type: submits_to }
      - { id: engine-hands-to-validator,    from: transaction-engine, to: validator,          type: hands_to }
      - { id: validator-hands-to-store,     from: validator,          to: workspace-store,    type: hands_to }
      - { id: engine-records-in-audit-log,  from: transaction-engine, to: audit-log,          type: records_in }
```

**Proposed standard surface** (`transaction-workspace.sysml` — oracle-validated verbatim):

```sysml
package 'transaction-workspace' {

    package Entities {
        private import ScalarValues::Boolean;

        part def Agent;
        part def Service;
        part def Store;

        part 'proposer' : Agent;

        part 'transaction-engine' : Service {

            attribute base_current : Boolean = true;

            exhibit state 'transaction-lifecycle' {
                entry; then idle;

                state idle;
                state proposed;
                state valid;
                state committed;
                state refused;

                transition propose
                    first idle
                    then proposed;

                transition base_advances
                    first proposed
                    if base_current
                    do action { assign base_current := false; }
                    then proposed;

                transition validate
                    first proposed
                    then valid;

                transition reject
                    first proposed
                    then refused;

                transition await_adoption
                    first valid
                    then valid;

                transition commit
                    first valid
                    if base_current
                    then committed;

                transition refuse_stale
                    first valid
                    if not base_current
                    then refused;
            }
        }

        part 'validator' : Service;
        part 'workspace-store' : Store;
        part 'audit-log' : Store;
    }

    package RelationTypes {
        private import Entities::*;
        private import Parts::Part;

        connection def SubmitsTo {
            end source : Agent[1];
            end target : Service[1];
        }
        connection def HandsTo {
            end source : Service[1];
            end target : Part[1];
        }
        connection def RecordsIn {
            end source : Service[1];
            end target : Store[1];
        }
    }

    package 'change-pipeline' {
        private import Entities::'proposer';
        private import Entities::'transaction-engine';
        private import Entities::'validator';
        private import Entities::'workspace-store';
        private import Entities::'audit-log';
        private import RelationTypes::*;

        connection 'proposer-submits-to-engine' : SubmitsTo
            connect 'proposer' to 'transaction-engine';

        connection 'engine-hands-to-validator' : HandsTo
            connect 'transaction-engine' to 'validator';

        connection 'validator-hands-to-store' : HandsTo
            connect 'validator' to 'workspace-store';

        connection 'engine-records-in-audit-log' : RecordsIn
            connect 'transaction-engine' to 'audit-log';
    }

    requirement 'commit-requires-validation' {
        doc /* No proposed change is committed without passing through Valid. */
    }
    requirement 'no-stale-base-commit' {
        doc /* A change never commits against a base that is no longer the
             * one the workspace serves. */
    }
}
```

(Two notes a reviewer will want: the wildcard imports inside `RelationTypes` and of
`RelationTypes::*` into the model package are *allowed* — the explicit-membership refusal of
§2.1 governs importing **Entities members into purposeful-model packages** only, because that is
the import list that *is* the membership declaration. And `effects: { base_current: "false" }`
— the shipped YAML's quoted-string effect, a recorded schema wart — becomes
`assign base_current := false;`, typed by the standard grammar; the wart does not survive the
migration.)

**What stays in `transaction-workspace.mage.yaml`** (sketch, shapes per the current schema):

```yaml
mage: 1
system: transaction-workspace          # joins the .sysml package by name
relation-types:
  submits_to:  { absence: "…", composition: { path: forbidden } }
  hands_to:    { absence: "…", composition: { path: allowed } }
  records_in:  { absence: "…", composition: { path: forbidden } }
machines:
  transaction-lifecycle:
    purpose: { question: "…", represents: […], omits: […] }
models:
  change-pipeline:
    purpose: { question: "…", represents: […], omits: […] }
entities:
  validator:
    properties: { executes_in_state: transaction-lifecycle.proposed }   # §3.4
queries:        # all nine saved queries, verbatim as shipped — not one changes
  commit-without-validating:
    kind: behavior
    quantifier: exists
    behavior:
      form: reach
      target: { transaction-lifecycle.state: committed }
      avoid:  { transaction-lifecycle.state: valid }
  # … the other eight …
requirements:
  commit-requires-validation: { expressed_as: commit-without-validating, satisfied_when: refuted }
  no-stale-base-commit:       { expressed_as: committed-base-is-current,  satisfied_when: holds }
```

The acceptance reading the author asked for: the `.sysml` is recognizably SysML — a SysML
engineer reads the machine without MAGE training; the question language is untouched; the
machine's `omits` (no duration, no deadline, no fairness) are exactly as declarable as before;
and the one unguarded self-loop that carries the starvation lesson (`await_adoption`) survives
as three plain lines.

### 5.2 Embedded Sensor Node — structural + quantitative

**Proposed standard surface** (`embedded-sensor-node.sysml` — oracle-validated verbatim; the
shipped MAGE side is quoted in §3's rows and in full in the example file):

```sysml
package 'embedded-sensor-node' {

    private import SI::B;
    private import SIPrefixes::kibi;
    private import ISQInformation::StorageCapacityValue;
    private import ISQInformation::StorageCapacityUnit;
    private import MeasurementReferences::ConversionByPrefix;

    attribute <KiB> kibibyte : StorageCapacityUnit {
        :>> unitConversion : ConversionByPrefix {
            :>> prefix = kibi;
            :>> referenceUnit = B;
        }
    }

    package Domains {
        enum def Criticality { diagnostic; optional; essential; }
    }

    package Entities {
        private import Domains::Criticality;

        part def Firmware {
            attribute criticality : Criticality;
        }
        part def Buffer {
            attribute criticality : Criticality;
        }

        part 'mcu-runtime' : Firmware {
            attribute redefines criticality = Criticality::essential;
            attribute sram : StorageCapacityValue = 24 [KiB];
        }
        part 'sensor-driver' : Firmware {
            attribute redefines criticality = Criticality::essential;
            attribute sram : StorageCapacityValue = 8 [KiB];
        }
        part 'radio-stack' : Firmware {
            attribute redefines criticality = Criticality::essential;
            attribute sram : StorageCapacityValue = 36 [KiB];
        }
        part 'inference-engine' : Firmware {
            attribute redefines criticality = Criticality::optional;
            attribute sram : StorageCapacityValue = 12 [KiB];
        }
        part 'telemetry-queue' : Buffer {
            attribute redefines criticality = Criticality::essential;
            attribute sram : StorageCapacityValue = 32 [KiB];
        }
        part 'packet-buffer' : Buffer {
            attribute redefines criticality = Criticality::essential;
            attribute sram : StorageCapacityValue = 12 [KiB];
        }
        part 'model-weights' : Buffer {
            attribute redefines criticality = Criticality::optional;
            attribute sram : StorageCapacityValue = 72 [KiB];
        }
        part 'inference-workspace' : Buffer {
            attribute redefines criticality = Criticality::optional;
            attribute sram : StorageCapacityValue = 28 [KiB];
        }
        part 'logging-buffer' : Buffer {
            attribute redefines criticality = Criticality::diagnostic;
            attribute sram : StorageCapacityValue = 8 [KiB];
        }
    }

    package RelationTypes {
        private import Entities::Firmware;
        private import Entities::Buffer;
        private import Parts::Part;

        connection def OwnsBuffer {
            end source : Firmware[1];
            end target : Buffer[1];
        }
        connection def Feeds {
            end source : Part[1];
            end target : Part[1];
        }
    }

    package 'sensor-firmware' {
        private import Entities::'mcu-runtime';
        private import Entities::'sensor-driver';
        private import Entities::'radio-stack';
        private import Entities::'inference-engine';
        private import Entities::'telemetry-queue';
        private import Entities::'packet-buffer';
        private import Entities::'model-weights';
        private import Entities::'inference-workspace';
        private import Entities::'logging-buffer';
        private import RelationTypes::OwnsBuffer;

        attribute 'sram-budget' : StorageCapacityValue = 256 [KiB];

        connection 'radio-owns-telemetry-queue' : OwnsBuffer
            connect 'radio-stack' to 'telemetry-queue';
        connection 'radio-owns-packet-buffer' : OwnsBuffer
            connect 'radio-stack' to 'packet-buffer';
        connection 'inference-owns-weights' : OwnsBuffer
            connect 'inference-engine' to 'model-weights';
        connection 'inference-owns-workspace' : OwnsBuffer
            connect 'inference-engine' to 'inference-workspace';
        connection 'mcu-owns-logging-buffer' : OwnsBuffer
            connect 'mcu-runtime' to 'logging-buffer';
    }

    package 'sensor-dataflow' {
        private import Entities::'sensor-driver';
        private import Entities::'inference-engine';
        private import Entities::'telemetry-queue';
        private import Entities::'radio-stack';
        private import RelationTypes::Feeds;

        connection 'driver-feeds-inference' : Feeds
            connect 'sensor-driver' to 'inference-engine';
        connection 'inference-feeds-queue' : Feeds
            connect 'inference-engine' to 'telemetry-queue';
        connection 'queue-feeds-radio' : Feeds
            connect 'telemetry-queue' to 'radio-stack';
    }

    requirement 'firmware-fits-physical-sram' {
        doc /* The modeled firmware's SRAM allocations fit within the part's
             * 256 KiB of physical SRAM. */
    }
}
```

The `.mage.yaml` sibling keeps: both models' purpose blocks (the dataflow model's "omits: how
much SRAM any component holds" now reads against the *projected* graph model, which carries no
magnitude — §2.1), `residency: resident` per charge, the four saved queries verbatim (including
the `where: compare source.criticality lt target.criticality` cross-model question — nothing in
it changes), and the requirement join (`expressed_as: sram-fits-budget, satisfied_when: holds`).
The arithmetic the shipped header walks (232 of 256, margin 24) is unchanged — and the KiB
spelling now says in the model what the shipped version could only say in a ten-line comment.

### 5.3 The state-machine + sync + bounded-integer corner (Worker Queue / edge probe)

Worker Queue adds the two constructs 5.1 lacks: a bounded integer with an advancing effect, and
synchronized labels. The validated fragment (receipt 4, abridged to the two rows):

```sysml
part job : Job {
    attribute retry_count : Integer = 0;

    constraint retryCountDomain { 0 <= retry_count and retry_count <= 3 }

    exhibit state jobLifecycle {
        entry; then queued;
        state queued;
        state processing;
        state retry;

        transition claim
            first queued
            then processing;

        transition requeue
            first retry
            if retry_count < 3
            do action { assign retry_count := retry_count + 1; }
            then queued;
    }
}
```

`claim` is also a transition name in the `job-lease` machine; the `.mage.yaml` `events:` block
declares `claim: { participants: [job-lifecycle, job-lease] }` and the projection joins by name
— §4.5's ruling in action. A full worker-queue translation is Phase-4 corpus work; this corner
is here because it is where the finite-domain and sync decisions bite.

---

## §6. Never silently approximate — the refusal catalog

Each row is **valid SysML/KerML** (receipt 9 or 8 where noted), refused at projection with a D2
message naming the standard meaning, MAGE's bound, and the repair:

| Construct (valid SysML) | Refusal |
|---|---|
| `attribute n : Integer;` in a machine-bearing part, no domain constraint | "Integer is unbounded in this model. MAGE behavioral analysis requires a finite variable domain. Declare the recognized domain constraint (`lo <= n and n <= hi`) or remove this variable from the executable behavioral model." |
| any effect beyond `assign` (e.g. `send`, `perform`) | "This transition uses an effect behavior. Effects are valid SysML v2 but outside the current MAGE executable subset; only variable assignment is executable." |
| `accept` trigger on a transition | "Triggers are valid SysML v2 but MAGE transitions occur by selection, not event reception. Synchronization is declared in the MAGE analysis document's `events:` block." |
| binding connectors (`bind`, binding connection usages) | "This binding requires value propagation or feature-chain reference. MAGE supports identity correspondence only, and spells it through the namespace (one declaration, imported by each model)." |
| `[0..*]` or range multiplicity on an entity usage | "MAGE charges by cardinality and cannot charge an unbounded one. Declare an exact count (`[4]`) or a single entity." |
| `calc def` / calculation usages | "Totals and aggregations are MAGE analyses (`latency`, `cost`, `peak_memory`), not authored model content." |
| user-level `specializes` between entity types | "Entity types are flat in MAGE. Declare a property with a domain, or a relation, instead." |
| `private import Entities::*;` inside a purposeful-model package | "A purposeful model's membership is a modeling decision. Import each member by name so the omissions stay visible." |
| nested part usages (composite structure) | "Structural containment is not in the current subset. Model containment as a declared relation if the model needs it." |
| quantity dimensions outside `DIMENSIONS` (e.g. `LengthValue`) | "Dimension `length` is not in MAGE's closed dimension table. Extending the table is a deliberate act (see the quantities design), not a side effect of parsing." |
| free-standing `state def` shared by parts | "A MAGE machine describes one entity. Exhibit the state usage inside the part it describes." |

The parser *understands* more grammar than the projection accepts — that is required for D2/D3
messages to be good (author §15) — and none of that understanding leaks into the executable
surface: ENGINE ⊃ LANGUAGE ⊃ UI continues to govern, with the parser now a fourth, outermost
ring that feeds the other three nothing new.

---

## §7. Round-trip, as an invariant

`source → parse → AST → project → IR → print → source′ → parse′ → project′ → IR′` with
**IR ≡ IR′** under the engine's canonical form (`canonicalize`), per system: same entity set,
same typed relation set, same machine (states, initial, transitions with guards/effects/domains),
same quantity table after unit normalization, same requirement set. Textual identity is not
required; comment/format preservation is desirable and secondary. Two consequences the design
fixes now:

- The printer is a first-class deliverable of Phase 3 (it is also the migration tool: shipped
  YAML → IR → printed `.sysml` + residual `.mage.yaml` is exactly the §10 corpus path run
  backward).
- Quoted unrestricted names make id round-trip lossless with **no name map**. A camelCase
  convention was considered and rejected: it would make round-trip depend on a reversible
  renaming, which is a second source of truth.
- The per-run oracle gate (§8) also guards the printer: everything the printer emits must
  validate clean, so a printer defect that emits non-standard syntax fails the gate rather than
  propagating into the corpus.

---

## §8. Parser strategy — recommendation with evidence (decision deferred to the Phase-2 review, per the author)

**Recommendation: Option C — implement the restricted grammar ourselves, in TypeScript, with the
Pilot as a per-run oracle gate over every fixture, example, and printer output.** The spike
(Phase 2) should still build the comparison table, but the evidence already in hand orders the
options:

- **(A) Reuse an existing open parser.** The candidate is SysIDE. Verified today rather than
  recalled: the open-source core (`sensmetry/sysml-2ls`, EPL-2.0, a Langium-based parser +
  language server) was **archived 2025-10-13** and is spec-frozen at the KerML/SysML **2024-12**
  release — before the finalized 2025-02 normative artifacts the conformance corpus cites; its
  maintained successor ("Syside Editor") is **closed-source** (free to use, no source access),
  with the commercial tier carrying the tooling MAGE would need to embed. Adopting the archived
  EPL-2.0 core means adopting an unmaintained full-language parser to use ~5% of it, at a frozen
  spec version. Possible, not attractive. (Sources: the sensmetry/sysml-2ls GitHub repository
  and Sensmetry's "Syside Editor rebirth" announcement, read 2026-10-05.)
- **(B) Generate from a grammar.** The authoritative machine-usable grammars are the Pilot's
  Xtext grammars (`org.omg.kerml.xtext`, `org.omg.sysml.xtext`, EPL-2.0, inside the kernel jar
  this wave ran). Xtext generates Java/Eclipse artifacts; the Workbench is browser-native
  TypeScript with a zero-dependency posture (`package.json` dev-deps only). Porting the grammar
  to a TS generator is Option C with an extra translation step and a false air of authority —
  the port would be ours, unverified, exactly like a hand parser but larger.
- **(C) Restricted grammar, hand-written.** The accepted surface measured from §3's table is
  ~30 productions (package, import, enum def, part def/usage, attribute forms, connection
  def/usage, exhibit state, state, entry, transition with first/if/do-assign/then, the two
  recognized constraint shapes, requirement + doc, quoted/qualified names, number + unit
  literals). The historical objection to C — you cannot tell whether you accepted non-standard
  syntax — is the objection the oracle kills: **every fixture, every shipped translation, and
  every printer output passes through the Pilot per run** (the differential design's P1 gate,
  which this wave exercised eleven times, including one negative control that correctly
  burned). The §8 rule binds the implementation: every production is written against the
  standard grammar and carries its citation; the grammar file is a subset of the standard's,
  not a MAGE grammar that resembles it.

The one risk C carries that A does not: *error recovery and diagnostics on far-outside-subset
input* (a student pastes a full SysML model). Mitigation is scoped in §6 — the parser
understands the surrounding grammar shallowly (enough to say "this is valid-looking SysML
outside the subset" with a construct name rather than a token error), and the Pilot gate keeps
us honest about which is which. The spike's falsifiable exit question: can a ~30-production
recursive-descent parser with spans and recovery be held under ~2k lines with D1–D4 diagnostics
that a student can act on? If no, revisit A despite its freeze.

---

## §9. Conformance claims after the migration — what is checkable, and the §12 bound

The evidence vocabulary and rungs are unchanged (`SEMANTICS.md` §13; manifest ceiling). The
migration *adds* claims; it must not inflate them:

- **Syntax acceptance** ("the subset parser accepts only standard-legal text") becomes
  `checked` per run by the Pilot gate — the first new checkable claim, and the cheapest.
- **Static semantics** (D3 rules) are MAGE's own; bounded suites, not conformance claims.
- **Projection fidelity** (the §10 parity gate) is MAGE-vs-MAGE: old IR vs new IR. It proves
  the migration, not the standard.
- **Semantic correspondence** stays per-area, at its current rungs — all five `asserted` today —
  with one exception the differential design already designed and this document re-bounds:
  **the `.kpar` ↔ `DIMENSIONS` conversion-factor join is the only quantity correspondence a
  gate can hold.** Re-verified this wave: the Pilot validates `LengthValue = 2 [kg]` with no
  error and no warning (receipt 8), and does not reduce quantity expressions — so the reference
  implementation cannot check the thing MAGE pins about quantities, and nothing downstream of
  parsing may claim otherwise. The gate's claim is exactly: "MAGE's conversion table equals the
  normative `.kpar` declarations, factor by factor, for the units MAGE carries." Not
  "SysML-conformant quantities." The KiB admission (§3.3) *widens* this gate usefully: `kibi`'s
  factor 1024 is itself a `.kpar`-declared fact the gate can hold.
- **Naming** follows the author's §20 verbatim: *"MAGE accepts a restricted subset of SysML v2
  and KerML and projects supported constructs into its executable modeling kernel."* The subset
  corpus grows per supported construct with positive, unsupported-neighbor, and malformed
  fixtures (the receipts 9/7 pattern), each tagged asserted-vs-checked per claim.

## §10. §13 of the brief — capability-keyed licensing. Ruling: DECOUPLE; it is independent work

**Ruled: lift it out.** Capability-keyed licensing depends on no parser, no syntax, and no part
of this migration. The evidence that it is ripe is already in the tree: the absent-substrate
gate (`absentSubstrateVerdict`, `model-types.ts:1316`) is the mechanism's coarse ancestor, and
the sensor-node example *states the desired diagnostic in prose* — the resident-sum reduction
"answers 'what if everything is live at once' and cannot answer 'is everything live at once'",
naming operating modes and lifetimes as the missing distinctions
(`examples/embedded-sensor-node/system.mage.yaml:39-52`). The design the decoupled Epic should
build: each question form's registry entry declares `requiresCapabilities:` (e.g. `peak_memory`
→ quantities, dimension(memory), execution structure, allocation lifetimes); the licensing gate
compares against what the loaded system's declarations provide; the refusal names the missing
*distinction* and the modeling act that would supply it — "Peak memory cannot be determined
because the model declares memory allocations but not their overlapping lifetimes," not
"quantitative substrate missing." Populate for the obvious current cases only (the three
metrics, the six behavioral forms' substrate needs, the five composing graph forms' V7 gate —
all already registry-resident facts); the mechanism is the deliverable, exhaustive population is
not. The multiplicity admission (§4.1) lands its peak-vs-total honesty on this mechanism, which
is one more reason to build it first: the refusal quality is what makes that admission safe.

## §11. The Chapter-2 tension — ruling, and a one-sentence book follow-up

Chapter 2 §2.1.4 (read at this HEAD) argues semantic commitment is an axis, the table rows "are
examples, not maturity levels," and strong commitment "is useful only when the resulting
precision and machine operability justify its cost"
(`book/part2/2.1-context-is-the-first-modeling-problem.md:357-371`). The Workbench adopting a
SysML/KerML surface does not contradict this — it *instantiates* it: the Workbench's engineering
need is mechanical decidability of a closed question set, which is precisely the need the
chapter says licenses the strong end. The conceptual order (engineering need → semantic
commitment → language example) survives; the tool now sits at a named point on its own spectrum
*because its need put it there*. But the brief is right that §16's "don't turn Learn into a
SysML tutorial" is a tension to manage, not an assertion — a student who only ever sees the
strong end will read the spectrum as a ladder regardless of what the prose says. **Ruling: yes,
Chapter 2 owes one sentence** — in §2.1.4 near the table, to the effect of: *the MAGE Workbench
itself models at the strong end of this spectrum — a restricted SysML v2/KerML subset — because
its questions must be mechanically decidable; that is a consequence of its need, not a
recommendation of the row.* Filed as a book follow-up for the orchestrator (`book/part2/` is
owned by a live sibling wave this session; nothing here touches it).

## §12. Phases against v0.2 — what may land when

**Nothing in this design changes v0.2 behaviour, and nothing in it requires v0.2 to wait.** The
phase map, with the v0.2 boundary explicit:

| Phase (author §22) | Content | v0.2 relation |
|---|---|---|
| 0 — freeze the semantic baseline | pin constructs, outcomes, evidence, coverage | **largely already discharged, and worth saying so**: every shipped example pins outcome + coverage kind + evidence shape in `expected-results.yaml`, verdict-checked in CI (54 queries; mutation-driven conformance fixtures besides). Remaining Phase-0 work is an inventory freeze — §3's table is that inventory on the construct side — plus a sweep for any unpinned outcome. Do it immediately; it is characterization pinning and protects v0.2 regardless of whether the migration proceeds |
| 1 — this document | the subset, the mappings, the translations | prose only; no behaviour |
| 1.5 — decoupled §13 licensing (§10) | capability-keyed refusals | independent; may land before, with, or without the migration — post-v0.2 as implementation, but not sequenced behind Phase 2 |
| 2 — parser spike | A/B/C comparison, exit question of §8 | **post-v0.2** |
| 3–9 — AST/projection, corpus migration, round-trip, conformance evidence, Workbench, Learn, agent eval | all implementation | **all post-v0.2** |

The migration gate for Phase 4, stated here so it is pinned before any parser exists: *old model
→ current IR → questions → answers* must equal *new `.sysml`+`.mage.yaml` → parser/projection →
IR → same questions → same answers* — verdict, evidence shape, and coverage kind, per the
expected-results discipline (semantic outcomes, never step counts). Where literal IR identity is
inappropriate (ordering, generated ids), the comparison is between canonical forms
(`canonicalize` exists and is the arbiter). No example changes its answer because its syntax
changed.

## §13. What the brief and the author's direction got wrong — reported, per instruction

1. **"A working oracle … already committed at `conformance/oracle/FixtureValidateDriver.java`"
   — not at this worktree's HEAD.** At `19cbd9a6d` no `conformance/oracle/` exists; the driver
   lives in the sibling worktree (`wb-sysml-differential-design-261005`), un-landed. This wave
   copied it from there and rebuilt it against the session-cached kernel. The claim is true of
   the session, stale of the branch — the exact stale-claim class the brief itself warns about.
2. **"~1.7 s" per oracle run — not reproduced.** Measured here: 8.1 s cold, 1.9–3.7 s warm per
   run (full library load dominates). Same order, right conclusion (cheap enough to gate),
   wrong figure.
3. **The author's §6 "check the language" instruction cut against the author's own Option-B
   framing less than expected:** the standards-compliant annotation mechanism *does* exist and
   validates (`metadata def` + `@`, receipt 4). Option B fails on architecture, not on
   availability — worth recording because the brief's phrasing ("whatever … actually exists")
   implied doubt the probe removed.
4. **The author's structural-needs list includes "source/target typing," which MAGE today does
   not have at all** — relation types declare no endpoint typing. The subset *gains* it from the
   standard (connection-def ends), a small commitment increase the brief's framing ("the
   intended borrowing is the typed-element/relationship/feature subset") did not flag as new.
5. **The binding fixture's spelling is already known-illegal, and this design retires rather
   than repairs it.** The brief reports `binding-connector-identity-001` fails the oracle (8
   errors). The right fix at the *language* level is §3.4's: identity moves to the namespace,
   where it cannot be spelled wrong; the fixture's repair (owned by the conformance wave)
   should follow the subset, not precede it.
6. **One premise of the author's §3 behavior list — "synchronization if needed" — resolves as
   "needed, and deliberately not borrowed":** worker-queue ships sync today, so the subset had
   to rule, and the ruling (§4.5) is that the standard's nearest spelling (`accept`) means the
   wrong thing. The brief's framing treated sync as an open inclusion question; it is actually
   a refuse-the-plausible-spelling case, the same class as `state-of-entity`.
7. **Minor:** the brief's "expect ~1389 / 0 / 0 and parity 0 over 26" held exactly at this HEAD
   (measured; §0). The sensor-node §13 prose the brief cites as `:44-53` sits at `:39-52` at
   this HEAD. And `node_modules` symlinks were absent from this worktree on arrival (all three
   created per the repo procedure; no `npm install` run) — the same infrastructure gap two
   sibling waves hit.

---

*Prose only. Gates at this HEAD measured before writing and untouched by it: check clean,
1389 / 0 / 0, parity 0 over 26. The eleven oracle runs are transcribed in §0a; the probe files
remain in session scratch (deliberately uncommitted — fixtures become corpus entries in Phase 4,
through the conformance wave's discipline, not through this design).*
