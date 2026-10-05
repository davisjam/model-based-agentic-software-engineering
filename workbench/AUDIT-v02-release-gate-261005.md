# Audit — the v0.2 release gate (§20) against HEAD

> **DRAINED 2026-10-05, items 1–3 of the critical path in §5; two of this audit's own claims
> corrected in the process.** Criterion 13's grade is now derived from each fixture's `evidence[]`
> (`test/conformance.test.ts`) and `methodDiscipline` reworded to *weakest DECISIVE rung* — **no
> fixture's grade changed**, because the fixtures were already practising the corrected rule, so the
> two "MISMATCH" rows in §3 were mis-graded by the *sentence* and not by the corpus. Criteria 1, 4
> and 14 are held by `test/release-gate-negatives.test.ts`. Criteria 13 and 14 are reworded in §20
> itself, and §21 now carries the flagship mapping plus the menu-order note.
>
> **Two corrections to this audit, both measured:**
>
> - **§4's criterion-4 row says `tsc` would not complain if `"violated"` were added to `Outcome`. It
>   does.** `OUTCOME_WORDS` in `src/engine/index.ts` is already `Readonly<Record<Outcome, true>>`, so
>   the edit is `TS2741` on that table. The guard still earns its lines one rung along: a `TS2741`
>   naming a lookup table is cheapest silenced by adding the key, which leaves the criterion violated
>   and the suite green, so the assertion is what catches the accommodation.
> - **§3 and §4 propose asserting the two unions are "disjoint". They are not, and must not be** —
>   `inconclusive` is deliberately in both and `verify()` maps one onto the other. A disjointness
>   assertion would land RED and the only way to green it would be deleting a word from a union. The
>   property landed is that the intersection is **exactly** `inconclusive`, which is strictly
>   stronger: it also catches `inconclusive` LEAVING one of them.
>
> **Still open:** §5 item 4, the LTL reachability hole — left for the author, as this audit asks. And
> criterion 14's remaining gap: nothing in code names which five of six built-ins are flagships, which
> needs a declared subset in the application's example registry. Reported rather than reached.

**Base:** `4390b72c` ("the vacuity-budget ruling"), tree clean.
**Baseline measured here, not quoted:** `npm run check` exit 0 (tsc, Node 24.21.0 on the pin);
`npm run test` **1349 pass / 0 fail / 0 skipped / 0 todo**; `npm run check:parity` → `UX-I1: 0
violation(s) over 26 capabilities`. All three match the brief's numbers.

**Gate audited:** `DESIGN-v02-examples-and-semantic-completion-261004.md:1775-1799`.
**Scope note:** a sibling wave owns `test/` additions and `examples/*/expected-results.yaml`. Every
count below over those files was measured at `4390b72c` and will move under that wave.

---

## 1. The criterion count

**The gate enumerates 21 criteria.** Measured, not read off a header:

```
$ sed -n '1779,1800p' DESIGN-...-261004.md | grep -c "^[0-9]\+\."
21
$ ... | grep -o "^[0-9]\+" | tr '\n' ' '
1 2 3 4 5 6 7 8 9 10 11 12 13 14 15 16 17 18 19 20 21
```

**It did not match the brief, and the brief is the party that is wrong.** The brief states the list
"enumerates twenty" and that the gate "is cited elsewhere as a 21-criterion gate." Both halves are
off:

- The list enumerates **21**. Criterion 21 — *"No built-in example relies on hidden example-specific
  semantics"* — is the one the brief dropped, and it is also the only criterion the brief's §"worth
  extra care" section never mentions, which is consistent with a read that stopped at 20.
- **No "21-criterion" citation exists in the workbench.** I searched every `.md`, `src/` and `test/`
  file for `[0-9]+[- ]criteri`, `criteria gate`, `twenty`, `twenty-one`. The only `21`s are
  `BASELINE-a11y-261002.md:520` and `test/browser/workbench.test.mjs:414`, both about *"all 21 of the
  page's buttons"* — unrelated to this gate.
- **§20 states no count of its own.** Its only framing line is *"Do not call this semantic regime
  complete until all of the following are true"* (`:1777`). There is no number to disagree with the
  list, so the doc is internally consistent.

**So this is NOT a fourth instance of the brief's named class.** That class — a number written
against a set the work keeps changing — requires a *recorded* number that a growing set falsified.
Here the artifact records no number; the discrepancy was introduced in the brief, reading an
unnumbered list. The honest classification is **an orchestrator-side recall error about an artifact
that states no count**, which is a different and cheaper failure: it is caught by counting, and it
rots nothing in the tree.

**But a genuine instance of the class does exist at HEAD, and I found it** — see criterion 19 below
(`src/learn/content.ts:320-321`, a count written *today* inside a comment stamped `CORRECTED
261005`, wrong in both of its two numbers). That is the fourth instance, and it is not the one the
brief pointed at.

### A separate hazard the count question exposed: "§20" is overloaded three ways

Reading the gate required disambiguating a reference the workbench uses for three different things:

| "§20" as used in | Means |
|---|---|
| `DESIGN-v02-examples-and-semantic-completion-261004.md` | **this release gate** (21 criteria) |
| `requirements-human-ux-261002.md` | the **capability table** — `test/capabilities.test.ts:466-471` reads it by header and calls it "the §20 table" |
| "spec §20" in `DESIGN-learn-questions-261004.md:190`, `DESIGN-v02-requirements-261004.md:56` | the **four-valued verification vocabulary** |

`test/capabilities.test.ts:444` is titled `§20 coverage` and reads a *different document's* §20. A
brief that says "§20" without naming the file sends an agent to the wrong section. **[FIX]**, ~10
lines: qualify each bare `§20` with its file. Cheap, and it removes a standing mis-dispatch risk.

---

## 2. Per-criterion verdicts

Legend: **HOLDS** = satisfied at HEAD. **PARTIAL** = the substance is largely there and a named part
is not. **†** = true at HEAD with **no test or gate holding it** (collected in §4).

| # | Criterion | Verdict | Evidence verified at HEAD |
|---|---|---|---|
| 1 | No semantic use of overloaded `join` remains | **HOLDS †** | Search widened on all three axes (below). No `join` survives as a registry row, a query `form:`, a schema enum value, or a schema key. `combineWith` survives only in the demoted role §4.1 licenses: `src/engine/model-types.ts:345` (*"not here, deliberately"*), `:602` (*"**Not a semantic relationship**"*), `src/learn/main.ts:369` (*"DEMOTED to navigation"*). |
| 2 | Bindings and compositions are distinct registry concepts | **HOLDS** | Two interfaces with disjoint required fields: `BindingSemantics` (`model-types.ts:407`, carries `correspondence` + `witness`) vs `CompositionSemantics` (`:456`, carries `restricts` + `result`). Two registries: `BINDINGS` `:1160`, `COMPOSITIONS` `:1227`. Held by tests: `test/bindings-census.test.ts:507` (every cross-type reference is named by a registered BINDING), `:549` (a composition claims no model-authored reference — *exempt, not excused*). |
| 3 | Requirements and verification are implemented | **HOLDS** | `requirements:` is an authored top-level schema key; verification is derived and stored nowhere. `verify()` at `src/engine/verification.ts:267` is sound in every arm I read: `exhausted`→`inconclusive` (`:307`), `unlicensed`→`inconclusive` (`:315`), vacuous→`inconclusive` (`:287`), bounded coverage→`inconclusive` (`:300`). Tested by `test/verification.test.ts`, `test/requirements-authored.test.ts`, `test/conformance.test.ts:691`+`:732`. |
| 4 | `violated` exists only at the verification layer, not as a raw query truth value | **HOLDS †** | Type-level, and the vocabularies **are** disjoint in the types: `Outcome = "holds" \| "refuted" \| "inconclusive" \| "unlicensed"` (`src/ir/types.ts:767`) vs `VerificationStatus = "satisfied" \| "violated" \| "inconclusive" \| "error"` (`src/engine/verification.ts:181`). Grepping `violated` across `src/` returns the verification module plus one capability *summary string* (`src/app/capabilities.ts:572`) and nothing else. |
| 5 | LTL has defined trace semantics | **HOLDS** | `satisfiesAt(formula, lasso, i)` at `src/engine/ltl-trace.ts:99` implements `π, i ⊨ φ` per operator. Cross-checked against an independent automaton path: `test/ltl-oracle.test.ts` generates (formula, lasso) pairs and requires `satisfies` and `automatonAccepts` to agree. |
| 6 | Terminal behavior is specified | **HOLDS** | Stutter-closure at dead ends, so `X φ ⟺ φ` at a halt falls out of the definition rather than being special-cased (`ltl-trace.ts:97`); a `Lasso` cannot have an empty cycle (`:61-63`). Three tests: `test/ltl-product.test.ts:253`, `:263`, `:284`; `test/ltl-oracle.test.ts:401`, `:473`. |
| 7 | Fairness policy is specified | **HOLDS** | **Specified as an explicit, costed absence — and I rule that this satisfies "specified."** `src/engine/behavior.ts:4-5`; `SEMANTICS.md:1024-1037` (the v0.1 statement plus its 261004 supersession, separating the liveness half from the fairness half rather than striking both); `DESIGN-v02-ltl-foundation-261004.md` §5 is titled *"No fairness, what it costs, and P5's actual verdict."* The absence is not merely asserted — its **consequence is pinned**: P5 (*"every proposed transaction eventually commits or refuses"*) is measured **refuted on both machines** in `test/acceptance-p1-p5.test.ts`, because nothing forces an agent that captured a base to decide and no fairness assumption rules that trace out. A policy whose consequence is a green assertion is specified in the only sense that can rot-proof it. |
| 8 | Counterexamples are first-class | **HOLDS** | `EvidenceRole = "witness" \| "counterexample"` in the IR (`src/ir/types.ts:750`) — a first-class evidence role, not an absence. `src/engine/types.ts:131`: *"a counterexample refutes it."* Tested: `test/engine-behavior.test.ts:34` (*"a violated universal yields a COUNTEREXAMPLE, not an absence"*); LTL counterexamples are explicit lassos (`test/ltl-product.test.ts:263`). |
| 9 | Quantities have unit checking | **HOLDS** | `DIMENSIONS` carries a per-dimension `units` table with conversion factors (`src/ir/types.ts`, consumed at `src/quant/budget.ts:188`, `src/quant/types.ts:187`). Out-of-dimension units are **refused by name, not coerced** — `src/quant/types.ts:205` (*"A silently assumed unit is the dimension bug this exists to prevent"*), `src/validator/rules.ts:522-526`. Tested: `test/conformance.test.ts:559` (the verdict follows magnitudes, not unit tokens), `:604` (out-of-dimension unit refused by name), `test/learn-questions.test.ts:562` (base↔declared conversion exact for every declared unit). |
| 10 | Finite measured executions are distinguished from infinite LTL traces | **HOLDS** | Two different types carry the two notions, and neither can impersonate the other. Quantities: a measured figure carries `kind: "finite"` with a magnitude (`src/quant/types.ts:79`); an unbounded maximum yields a **lasso witness with no magnitude** rather than a number — `test/quant-query.test.ts:351` (*"NO magnitude — no finite number is true"*), `test/quant-eval.test.ts:295` (*"refutes any finite bound with a LASSO, not a new outcome word"*). LTL: `Lasso` requires a non-empty cycle precisely so there is no "silently-finite word" (`ltl-trace.ts:52-63`), pinned at `test/ltl-oracle.test.ts:473`. |
| 11 | Behavior → Quantity composition is typed and registered | **HOLDS** | Exactly one `COMPOSITIONS` row, and it is this one: `executions-selected-by-behaviour`, `from: "state-machine"`, `to: "quantitative-model"`, `restricts: "execution"` (`model-types.ts:1229-1236`). Typed by `CompositionSemantics` with a required `semanticBasis`. Forward-policed against becoming a pipeline: `test/model-types.test.ts` holds that no composition's target domain is another's source, which is what a chain would look like (`model-types.ts:456` doc). |
| 12 | All five owed SysML/KerML conformance fixture families exist | **HOLDS** | **5 fixtures on disk**, one per §35.4 row, `owed: []`. Grades: **0 oracle-executed, 3 normative-artifact, 2 spec-inspected** — and the `status` string is *derived in the test and compared*, so it cannot drift (`test/conformance.test.ts:299-303`). The control is a **partition** assertion, not an emptiness check: `[...discharged, ...stillOwed]` must equal `SECTION_35_4_ROWS`, so a row deleted from *either* array fails (`:313-328`). Each row must independently still resolve against the live schema and registry (`rowResolves`). Each fixture's correspondence is additionally **executed against the MAGE side with a mutation control that flips the verdict** (`:484`, `:517`, `:559`, `:629`, `:691`). |
| 13 | Fixture evidence method is recorded honestly | **PARTIAL** | See §3 — the fixtures are honest; the manifest's *stated* discipline contradicts its own practice on 2 of 5 rows, and the grade is not independently checkable. |
| 14 | All five built-in examples ship | **HOLDS on substance; the criterion is MISWORDED †** | See §3 — six ship, the five flagships map cleanly, and nothing in code names which five are flagships. |
| 15 | Every executable student question is backed by a registered query | **HOLDS** | `tryAsking` — the student-facing question labels — is *derived* from `queries[].label` in the fixture, not authored separately (`src/app/examples.ts:157-169`), so a presented question that is not a query row cannot exist. Held at `test/examples.test.ts:277` (*"the supplied and presented query sets are exactly as declared"*). Learn's executable readouts are **re-derived live** rather than transcribed: `test/learn-questions.test.ts:210` (counterexample readout re-derived by running the query), `:239` (every change row's "now" is the live outcome), `:295`, `:469` (every requirement / ceiling chain's LIVE verdict agrees with the fixture). |
| 16 | Every expected answer is test-pinned | **HOLDS** | `test/examples.test.ts:236` runs **every** fixture query through the facade and compares outcome, coverage **and evidence** — 54 query rows across the six examples at this HEAD. The harness is itself falsified: `:251` is a negative control mutating an expectation three ways (outcome, ordered path, label bound) and requiring each to be caught, including *"a one-node path — the shape a vacuous `holds` takes."* |
| 17 | Every promised mutation is tested | **HOLDS** | `test/examples.test.ts:578` — *"every declared modification changes a recorded answer, and discarding changes it back"* — over 15 `modifications` rows across the six examples. Both directions, so a modification that changes nothing fails. |
| 18 | Every pinned property is automatically rechecked | **HOLDS** | The P1–P5 suite runs inside the default `npm test` (`test/acceptance-p1-p5.test.ts`), and so do the requirement and coverage re-derivations (`test/examples.test.ts:327`, `:1071`). The *"automatically"* half is held structurally by `test/gate-reachability.test.ts`: `:343` every gate is reached by the default gate **and** by CI or its exclusion is declared; `:856` every test file is matched by a gate script's glob **and** every glob matches a file; `:901` the pinned coverage gates exist and the declared script reaches each. That is the control that makes "automatically" more than a claim. |
| 19 | Learn's standards claims derive from registry provenance | **HOLDS** | And the evidence is **derivation, not substring-on-prose**. `test/learn-questions.test.ts:741` takes the rendered substrate table's standards column and `assert.deepEqual`s it against `BORROWED_STANDARDS` computed from the registry; `:760` re-derives the *not-attributed* list by walking `MODEL_TYPES[].semanticBasis` and every primitive's basis, so an over- or under-attribution fails from either side; `:703` checks the table is every borrowed substrate with the registry's own concept and clause; `:154` every citation names a file that exists **with its symbol in it**. One `prose.includes(...)` exists at `:657`, but its needle is `affordanceParityGate().headline` — derived from the live gate, so it is a derivation check wearing a substring's clothes. **Carries a [FIX]:** a stale count in a doc comment (§3). |
| 20 | The agent facade exposes the same semantic operations as the human interface | **PARTIAL** | See §3 — the per-capability half is airtight and blocking; the registry-completeness half runs only in a tier the default gate does not reach. |
| 21 | No built-in example relies on hidden example-specific semantics | **HOLDS** | Mechanically checked, not asserted: `test/examples.test.ts:168` `git ls-files` the tracked `.ts` under `src/ir/`, `src/engine/`, `src/validator/`, `src/render/` and fails if **any** file contains **any** example id. It guards its own reach (`assert.ok(tracked.length > 10)`). Scope caveat in §3. |

### How criterion 1 was searched

A negative claim is only as wide as its search, so all three axes were widened per the repo's own
rule:

- **PATH** — `src/` (100 `.ts`), `test/`, `examples/`, `models/`, and all three `*.schema.json`.
- **SPELLING** — `join`, `joins`, `combine`, `combineWith`, `merge`, `unify`, `fold`, `pipe`,
  `flatMap`, `zip`, `correlate`. (The design deliberately avoids some spellings, so searching only
  for `join` would have been the narrow search that misfired twice on 261004.)
- **SHAPE** — could the capability exist without the token? Checked for it as: a schema `enum` value,
  a schema object **key**, an exported registry (`grep -E "^export const [A-Z_]+"` over
  `model-types.ts` → `CLAUSE_OWED`, `MODEL_TYPES`, `BINDINGS`, `COMPOSITIONS`, and nothing else), and
  a query/primitive `form:` value.

**Result: zero hits in every shape.** Every surviving `join` is English prose — a comment in
`src/`, or an authored YAML comment describing a shared-identity crossing
(`examples/message-bus/system.mage.yaml:116`, `:386`). The old one-overloaded-`joins`-array-per-model
census is gone, and `test/bindings-census.test.ts:22-24` records that history in its header.

---

## 3. The four criteria that need a ruling

### Criterion 13 — the fixtures are honest; the discipline statement is not

The brief called this the sharpest criterion, and it is. Honesty is not a count, so I checked whether
each recorded method matches what the fixture actually does — by extracting every fixture's
`evidence[]` rungs and comparing against its headline `method`:

```
OK        kerml/association-link-typing-001       method=spec-inspected     rungs=[NA,NA,SI]    weakest=SI
OK        kerml/binding-connector-identity-001    method=spec-inspected     rungs=[NA,NA,SI,SI] weakest=SI
OK        sysml/quantity-unit-magnitude-001       method=normative-artifact rungs=[NA,NA,NA,NA]  weakest=NA
MISMATCH  sysml/requirement-verification-verdict-001  method=normative-artifact rungs=[NA,NA,NA,SI] weakest=SI
MISMATCH  sysml/transition-guard-occurrence-001       method=normative-artifact rungs=[NA,NA,NA,SI] weakest=SI
```

The manifest's own rule reads: *"A fixture's `method` reports the WEAKEST rung the pinned
interpretation depends on, and `evidence[]` lists every component with its own rung"*
(`conformance/manifest.json`, `methodDiscipline`). Taken mechanically, 2 of 5 rows violate it.

**They do not, and the fixtures are the honest party.** I read both mismatched `spec-inspected`
entries. Each is labelled `CORROBORATING prose` in its own `what` field, and each `methodWhy`
disclaims it in terms:

- `transition-guard-occurrence-001`: *"The SysML prose Description says the same thing and
  corroborates; it is not what the claim rests on."* The decisive fact is a declared invariant plus a
  declared multiplicity in the machine-readable Kernel Semantic Library.
- `requirement-verification-verdict-001`: *"Every decisive fact is declared, with no sentence between
  the artifact and the claim… The SysML prose Descriptions… corroborate and are listed separately;
  they are not what the claim rests on."*

And the under-claiming direction is practised too: `association-link-typing-001` grades itself
`spec-inspected` **despite** two normative-artifact components, because its one prose component is
marked `DECISIVE and prose`. The record is scrupulous. `reviewedByPerson` is `null` on all five with
an explicit refusal to fill it with the wave's name, because *"an agent reading a specification and a
person reading one are different warrants."*

**So the defect is the sentence, not the corpus.** The real rule is *weakest **decisive** rung*;
the stated rule says *weakest rung the interpretation depends on*, and "depends on" reads as a
`min()` over `evidence[]`. Two consequences:

1. A future reader — or a future gate authored from that sentence, which is the likely next step —
   mis-grades 2 of 5 rows and concludes the corpus is overclaiming when it is not.
2. `methodDiscipline` also says `evidence[]` lives beside `method`; it does not. The manifest rows
   carry no `evidence` key at all (verified: the 15 keys per row are fixed and `evidence` is not
   among them). It lives in each fixture's `oracle.json`. The statement is right about the artifact
   existing and wrong about where.

**The second, deeper gap: the grade itself is not independently checkable.**
`test/conformance.test.ts:261` asserts `record.method === f.method` where `f` comes from `CORPUS`, a
hardcoded table **in the test file**. That is double-entry bookkeeping, not derivation: it catches a
manifest edited without the test, and it cannot catch a fixture whose grade is simply wrong. Nothing
compares `method` to the `evidence[]` rungs it summarises. The test does hold two real honesty
properties — `oracle-executed` iff an `oracle` block exists (`:287-295`), and `reviewedByPerson`
stays `null` with the README cross-reference named (`:297`) — so the *overstatement* failure modes
are guarded. The *mis-grading* one is not.

**Verdict: PARTIAL.** Owed, and cheap:

- **[FIX]** ~2 lines: `methodDiscipline` → *"the weakest **decisive** rung"*, and say `evidence[]`
  lives in each fixture's `oracle.json`.
- **[LINT]** ~25 lines: add `decisive: boolean` to each `evidence[]` entry (the information is
  already in the `what` prose — `CORROBORATING` vs `DECISIVE` — so this only promotes prose to a
  field), then assert `method === weakest rung among decisive evidence` in
  `test/conformance.test.ts`. That converts criterion 13 from an honest act into a held one, and it
  is the single highest-value follow-up in this audit: it is the one criterion whose whole content is
  a property no current test can see.

### Criterion 14 — the five-vs-six mapping, ruled

Six directories ship, and the registry agrees: `SHIPPED_EXAMPLE_IDS` at `src/app/examples.ts:91-92`
lists six, in menu order, with **no flagship/bonus distinction in the type or the data**.

Mapping §21's five named flagships onto directories, decided from each example's own
`expected-results.yaml` title and summary rather than assumed:

| §21 flagship | Directory | Decided by |
|---|---|---|
| Secure Message Bus | `message-bus` | title *"Message Bus"*; three linked structural models |
| Transaction Protocol | `transaction-workspace` | title *"Transaction Workspace"*; the behavior flagship, cited as such at `test/acceptance-p1-p5.test.ts:61` |
| Embedded Sensor Node | `embedded-sensor-node` | title matches verbatim |
| **Processing Pipeline** | **`document-processing`** | summary: *"a document-remediation **pipeline** through a bounded-retry lifecycle **and** a quantitative performance model over the same components"* — which is exactly §21's gloss for this slot (*"different purposeful models participate in one engineering question through an explicitly defined semantic composition"*). It is also the example the one registered `COMPOSITIONS` row serves. |
| Autonomous Delivery System | `autonomous-delivery` | title *"Autonomous Delivery Rover"*; §19's capstone, five reductions of one machine |

**The sixth, `worker-queue`, is a bonus — not an unnamed flagship.** This is settled in code rather
than inferred: `src/app/examples.ts:73-74` states *"§31 drops Worker Queue from its three while §18
keeps it, and **nothing in this wave adjudicated that**. Six ship."* A v0.1 survivor carried forward
with its membership question open and declared open.

**What the criterion should read.** *"All five built-in examples ship"* is wrong twice — it
undercounts what ships, and it makes a count the criterion instead of a mapping. It should read:

> **14.** Every one of §21's five flagships ships as a built-in example, each mapped to exactly one
> example id; any additional built-in is declared a non-flagship with its membership question
> recorded.

Two further notes a reader will otherwise trip on:

- **Menu order is not §21's progression order.** §21 runs Message Bus → Transaction Protocol →
  Embedded Sensor Node → Processing Pipeline → Autonomous Delivery. Shipped order is Message Bus →
  Transaction Workspace → Document Processing → Worker Queue → Embedded Sensor Node → Autonomous
  Delivery, which swaps slots 3 and 4. The inversion is deliberate and reasoned at
  `src/app/examples.ts:76-80`: `exemplarFor` takes the *first* shipped example instantiating a type,
  so position determines which example every Learn card points at. **Not a defect** — but the
  "intended educational progression" and the menu a student sees are two different orders, and
  nothing says so where a reader of §21 would look. **[FIX]** ~3 lines, a note in §21.
- **Nothing in code names the five flagships** (†). No `FLAGSHIP_IDS`, no per-row flag. The mapping
  above lives only in a prose comment. A seventh example added tomorrow is indistinguishable from a
  sixth flagship. **[FIX]** ~8 lines: a `flagship: boolean` (or a `FLAGSHIP_IDS` subset with a
  test that it is a subset of `SHIPPED_EXAMPLE_IDS` of size 5). That also makes criterion 14
  checkable, which it currently is not in either direction.

### Criterion 19 — holds, and carries a genuine instance of the count-rot class

The derivation evidence is strong (table row 19). But the brief's instinct to check `src/learn/` was
right, and the thing I found is worse than the thing it warned about.

`src/learn/content.ts:316-327` carries a comment stamped **`CORRECTED 261005`**. It removes a stale
premise — *"no shipped example SAVES a quantity query"* — and in the same breath writes:

> *"Five saved quantity questions ship (four in `document-processing`, one in `embedded-sensor-node`),
> and two of them declare `within:`…"*

Measured at HEAD by walking `examples/*/system.mage.yaml` for `kind: quantity`:

```
autonomous-delivery    3  [nominal-mission-duration,
                           delivering-missions-within-the-duration-budget,   <- within:
                           compute-payload-fits-onboard-ram]                 <- within:
document-processing    4  [...  successful-executions-within-two-seconds]    <- within:
embedded-sensor-node   1  [sram-fits-budget]                                 <- within:
TOTAL 8 saved quantity queries; 4 declare within:
```

**Eight, not five. Four with `within:`, not two.** The distribution it does name is right as far as
it goes (4 in `document-processing`, 1 in `embedded-sensor-node`); it simply omits
`autonomous-delivery` entirely — the capstone, which ships three quantity questions and two of the
four ceilings. So the correction wave fixed one false premise and authored two false numbers in the
same edit, against a corpus that had grown underneath it.

**This is the fourth instance of the brief's class, correctly located.** It is also the ironic kind:
two lines below, the same comment warns that *"a stale premise in this position is the expensive kind
— it reads as license to hand-write what the corpus already declares."*

**It does not break criterion 19.** The *rendering* derives from the corpus and is held by
`test/learn-questions.test.ts:387` (*"the ceiling table is exactly the obligations the corpus
licenses — none invented, none lost"*) and `:399`/`:469`. The page is right; only the comment is
wrong. Verdict stays **HOLDS**, with:

- **[FIX]** ~4 lines: correct the two numbers, or — better, and the move the class argues for —
  delete the counts and name the derivation instead. A count in a comment has no gate and will rot
  again on the next example.

### Criterion 20 — the parity check covers the per-capability half, not the whole claim

Measured: `check:parity` → `UX-I1: 0 violation(s) over 26 capabilities`, ceiling
`PARITY_VIOLATION_CEILING = 0` (`src/app/capabilities.ts:1192`).

**What it does cover, and it is strong.** `checkAffordanceParity` (`:1101`) is **bidirectional per
capability row**: every capability must have a wired **human** affordance (`:1107`) *and* a wired
**machine** affordance (`:1113`) *and* name an application service (`:1119`). It folds in
`checkNavPaths` and `checkEscapeHatchFence`, so a console escape hatch cannot also be claimed as a
capability affordance — *"every machine site is in exactly one list."* One threshold, one definition
of passing, reached by both the default gate and CI through the same script (held by
`test/gate-reachability.test.ts:609`, with a negative control at `:624`). Counts are **derived**
(`CAPABILITIES.length`), never snapshotted — so the hardcoded-count hazard that bit elsewhere today
does **not** bite here. I checked for a literal `26` in the test, the script and the workflow: none.

**What it does not cover.** The gate ranges over the **registry**. A semantic operation present on a
live surface but registered to no capability is invisible to it. That hole is closed by
`checkRegistryClosure` (`:1349`) — but `checkRegistryClosure` **is not called from
`checkAffordanceParity`**. Its live-surface callers are browser-tier only:

- human side: `test/browser/workbench.test.mjs:395`, from the DOM of the served page;
- machine side: `test/browser/agent-coverage.test.mjs`, which walks `window.mage` with a recorder and
  reads back `describe().operations` from the served page (`:198`, `:237`) — genuinely measured, not
  a literal list.

Both live in `test:browser`, which the CI workflow runs (`pages.yml:171`) and **`npm run all` does
not** (`all` = `check:node && check && check:parity && test && build && test:smoke`). So the half of
criterion 20 that asks whether the *registry is complete* is enforced on push and not on the default
local gate. That is a *declared* exclusion, legitimately held by `gate-reachability.test.ts:343` — it
is a known boundary, not drift. But it means the answer to *"does `check:parity` cover criterion
20?"* is **no, it covers the per-capability half**, and the completeness half needs the browser tier.

**One more honest bound.** The LTL layer is a semantic capability in neither surface, by design:
`src/engine/ltl-product.ts:710` — *"Deliberately NOT wired into the query facade or the capability
registry… a formula surface that has not been designed is not a capability to advertise."* Verified:
`runLtlProperty` has **no `src/` consumer**; its only callers are three test files. The
`behaviorQuery.form` enum in `mage-query.schema.json` is `[reach, invariant, recurrence,
repeatable-cycle, deadend, transition-live]` — no LTL member, so **no saved query can name an LTL
property**. Parity therefore holds over a semantic surface *smaller than the engine's*. That is
honest and declared, and it is the right call; it is also the single most load-bearing fact about
this gate's scope, and §20 nowhere says so.

**Verdict: PARTIAL.** Owed:

- **[FIX]** ~1 line: decide whether `test:browser` belongs in `npm run all`, or record the
  exclusion's *reason* in the gate-reachability declaration (the mechanism already supports a
  declared exclusion — what is missing is the rationale a reader needs).
- **[DESIGN]** the LTL surface decision is §20's real open question, not a criterion gap. See §5.

### Criterion 21 — holds, with a scope caveat worth naming

`test/examples.test.ts:168` is the right shape: a mechanical scan, not a claim. Its `privileged` set
is `src/ir/`, `src/engine/`, `src/validator/`, `src/render/`, with `src/ui/` excluded for a stated
reason (the Load Example menu must name the examples it offers).

**Not in the privileged set, and arguably kernel:** `src/quant/`, `src/sparql/`. I checked both for
every example id: zero hits. So the gap is latent, not live. Also outside the set and worth seeing:
`src/app/learn.ts:214` hardcodes `exemplar: "message-bus/data-policy"`, and
`src/learn/questions.ts:291`/`:308`/`:351` cite example files as provenance pointers. Those are
pedagogy and citation, not semantics, so they are outside what criterion 21 forbids — but the test's
scope is narrower than a reader of its title would guess.

**[LINT]** ~2 lines: add `src/quant/` and `src/sparql/` to `privileged`. Zero findings today, which
is the cheapest possible moment to add them.

---

## 4. The true-but-untested set

Satisfied at HEAD with nothing holding them there. **This is tomorrow's regression surface**, and it
is the most useful output of this audit.

| # | Criterion | What is missing | Cost to hold |
|---|---|---|---|
| **1** | No semantic use of overloaded `join` | The one-`joins`-array-per-model census was **deleted**, and its removal is recorded only in a test's header comment (`test/bindings-census.test.ts:22-24`). Nothing forbids a new `join` registry row, query form, or schema enum member. The §4.3 ruling against `pipe`/`join`/`fold`/`flatMap` is held by `CompositionSemantics`'s *shape* (`model-types.ts:441`, `:1223`) — which stops a *composition* chain, not a `join` arriving as a new primitive or form. | **[LINT]** ~15 lines: assert no `QueryPrimitive.form`, no schema `enum` member, and no exported registry row matches a closed banned-combinator set. Rule 1 is checkable by name, which is exactly why it is worth checking. |
| **4** | `violated` only at the verification layer | The disjointness is real but rests on `Outcome` and `VerificationStatus` being two separate type aliases. **`tsc` would not complain if someone added `"violated"` to `Outcome`.** `test/conformance.test.ts:120` pins `VERIFICATION_TEXT`'s four keys — that guards the verification side's vocabulary and says nothing about the query side staying clear of it. | **[LINT]** ~8 lines: assert the two unions are disjoint, as values, in one test. The type information is already exported. |
| **14** | The five flagships | No code artifact names which five of six are flagships; the mapping lives in a prose comment that itself says the Worker Queue question is unadjudicated. | **[FIX]** ~8 lines — see §3. |
| **13** (part) | The method *grade* | Held by double-entry against a duplicate table in the test file; nothing derives `method` from `evidence[]`. | **[LINT]** ~25 lines — see §3. |
| **20** (part) | Registry completeness vs the live surface | Enforced only in `test:browser` — in CI, absent from the default gate. A local `npm run all` passes with an unregistered live affordance. | **[FIX]** ~1 line — see §3. |
| **21** (part) | Kernel scope | `src/quant/` and `src/sparql/` are outside the scanned set. Zero findings today. | **[LINT]** ~2 lines — see §3. |

Two criteria look untested and are not, so they are **excluded** deliberately:

- **7 (fairness)** — prose, but its *consequence* is a green assertion: P5 measured `refuted` on both
  machines in `test/acceptance-p1-p5.test.ts`. If someone silently introduced a fairness assumption,
  P5 would flip and that suite would go red. That is a held policy.
- **6 (terminal behavior)** — three tests plus the oracle.

**The pattern across the untested set:** every one is a **negative** property — *no* `join`, *no*
`violated` on the query side, *no* unregistered affordance, *no* kernel file naming an example.
Negative properties are exactly what a test suite built from positive examples cannot reach, and four
of the six are a single closed-set assertion each. The whole set is roughly **60 lines of lint**.

---

## 5. Is the v0.2 semantic regime completable from here, and what is the critical path

**Yes, and it is close.** 19 of 21 criteria HOLD; 2 are PARTIAL, and neither PARTIAL is a missing
capability — both are a control that does not quite reach the claim it is filed under. Nothing in
§20 requires work that has not been designed. The semantic kernel is built: trace semantics with an
independent oracle, stuttering terminal behaviour, lasso counterexamples as a first-class evidence
role, unit-checked quantities, a typed one-row Behavior→Quantity composition that cannot chain, five
conformance fixtures each executed with a mutation control, and 54 pinned answers plus 15 pinned
mutations re-derived through the facade on every `npm test`.

**The critical path, ordered by what unblocks what:**

1. **Close criterion 13 (the only criterion whose content no test can see).** The `decisive` field
   plus the derived-grade assertion. ~25 lines. Do this first: it is the one place where the gate's
   *stated* discipline and its *practised* discipline disagree, which is the session's organizing
   defect — a gate reporting something other than what it measures — appearing inside the honesty
   criterion itself.
2. **Land the ~60 lines of lint that hold the true-but-untested six.** All negative, all closed-set,
   all zero-findings-today. Cheapest permanent value in the audit, and the right moment is while the
   count is zero.
3. **Reword criteria 13 and 14 against what the work actually settled.** Criterion 14's "five" was
   false before it was written; criterion 13's "weakest rung" is a sentence a gate would
   misimplement. A release gate whose own text is wrong cannot be the thing you measure completion
   against.
4. **Rule on the LTL surface — the real open question §20 does not ask.** Every §20 criterion about
   LTL (5, 6, 7, 8, 10) is satisfied *at the layer*, and the layer reaches no shipped surface by a
   declared decision (`ltl-product.ts:710`). So **§20 can go all-green while no student and no agent
   can ask a temporal question.** That is not a defect against any criterion as written; it is a hole
   in the gate. Either add a criterion — *"every semantic layer §20 certifies is reachable from at
   least one shipped surface, or its non-reachability is declared"* — or accept that v0.2's semantic
   regime is complete with LTL as an internal capability, and say so in §20 rather than leaving a
   reader to discover it in a doc comment. **This is the one item needing the author**, and it is a
   wording/scope decision, not a build.

Items 1–3 are mechanical and total well under a day's dispatch. Item 4 gates whether "complete"
means what §20's reader will assume.

---

## 6. What §20, the rulings, and this brief got wrong

**§20 itself:**

- **Criterion 14's "five" was false when written** — six examples ship, and the registry comment
  (`src/app/examples.ts:73-74`) says the sixth's membership was never adjudicated. The criterion makes
  a count the test instead of a mapping.
- **§20 certifies five LTL properties and never asks whether LTL is reachable.** The gate's most
  consequential scope fact lives in a doc comment, not in the gate.
- **§21's progression order is not the shipped menu order** (slots 3 and 4 swap), for a reasoned
  cause recorded only in `examples.ts`.
- **"§20" is an ambiguous reference** across the workbench — three different §20s, one of them read
  by a test that calls itself "§20 coverage."

**The rulings that claim to satisfy it:**

- `conformance/manifest.json`'s `methodDiscipline` states a rule its own corpus violates on 2 of 5
  rows, and misplaces `evidence[]`. The fixtures are honest; the sentence describing their honesty is
  not.
- `src/learn/content.ts:320-321`, stamped `CORRECTED 261005`, replaces a stale premise with two wrong
  numbers (5→8 saved quantity questions, 2→4 with `within:`), omitting `autonomous-delivery`
  entirely.
- `SEMANTICS.md:1024` still reads *"liveness is not in scope"* in its body; the supersession is a
  block quote beneath it. Correct in substance — the note is explicit that the v0.1 paragraph stands
  as the v0.1 statement — but a grep lands on the superseded line first, which is how two of
  today's stale-premise briefs were built.

**This brief:**

- **The criterion count.** The list enumerates **21**, not twenty. No "21-criterion" citation exists
  in the workbench to disagree with it, and §20 states no count — so this is not the brief's named
  class but a recall error against an unnumbered list. The real fourth instance of that class is at
  `src/learn/content.ts:320-321`, and the brief did not know it was there.
- **Criterion 20's framing.** The brief asks whether `check:parity` "covers the claim or only part of
  it" and treats the 26-capability check as the candidate. The sharper fact is that the function that
  *would* cover the rest — `checkRegistryClosure` — exists, is correct, and **is not called by the
  parity gate**; it runs in a tier the default gate does not reach. The gap is wiring, not coverage.
- **Criterion 13's shape.** The brief expected the risk to be a mis-recorded method. The corpus is
  scrupulous in both directions, including under-claiming. The risk is that the grade is held by
  double-entry against a copy in the test file, so a mis-grade is *unfalsifiable* — which is a
  stronger finding than the one it was looking for.
- **The "test that pins prose" hazard.** Worth reporting as a near-miss: it is largely absent here.
  The one substring assertion on Learn prose (`learn-questions.test.ts:657`) derives its needle from
  the live gate, and the other (`:640`) is a **negative** assertion — it forbids words claiming
  enforcement the engine does not perform. That direction cannot assert a false claim is true; it can
  only prevent overclaiming. If the session is converting prose pins, `:640` is the shape to convert
  *toward*, not away from.
