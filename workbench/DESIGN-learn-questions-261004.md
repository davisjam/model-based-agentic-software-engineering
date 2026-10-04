# DESIGN — Learn, reframed around three kinds of engineering question (261004)

**Status: §1–§5 RATIFIED by implementation in this wave. §6–§8 are findings and handoffs.**
Written against `7145a5a6`, verified against the tree at authoring time. Every `file:line` below was
read with its surroundings, not grepped — the one discipline this document's own conclusions depend
on, since five of the scoping claims it was handed turned out to be wrong in the direction of
*under*-claiming what ships.

The author's guidance is `learn-1.md`, received 261004. Its thesis:

> Replace *"Here are the model types MAGE supports"* with *"Here are three kinds of questions
> engineers need to answer."* Then the model forms follow because each is an appropriate purposeful
> reduction for its question.

---

## 1. The constraint that decides every row below

`src/learn/content.ts:1-21` states the discipline the Learn page is built under, and UX-I9 is the
invariant: *"no DOM, no hand-written capability prose … every capability fact comes from a source the
kernel itself consults or ships."* Four sources are named there — the model-type registry through
`deriveLearnEntries` / `MODEL_TYPE_USES`, the shipped examples chosen by `presentIn`, the exemplar's
own declared `purpose` and saved queries, and the compositions `presentTypes` grounds. Section
labels are explicitly furniture; anything claiming what MAGE *supports* is derived.

Two gates hold it, and they decide the shape of this wave:

- **`test/learn-content.test.ts:231-239`** asserts `learn.html` contains no entry anchor, so prose
  cannot be hand-added to the shell.
- **`test/browser/smoke.test.mjs:226-240`** asserts the rendered section-id set is *exactly*
  `MODEL_TYPES` anchors + `MODEL_TYPE_USES` anchors + `GUIDE_ANCHORS`, by `deepEqual`. **A new
  section must therefore be DECLARED in a module the smoke tier imports.** There is no way to add
  one by writing markup, which is the architecture working.

So the reframe is **reorganising and re-motivating what exists, plus declaring new sections whose
content is computed from shipped artifacts.** A section teaching a capability the kernel lacks has
nothing to derive from, and the gate above refuses it by construction.

**One finding about the discipline itself, stated up front because four rows below turn on it.**
`src/learn/content.ts`'s header lists four derivation sources. It is not the closed set it reads
like: `src/app/examples.ts:12-29` already establishes a *fifth*, with a written rationale —
`examples/<id>/expected-results.yaml` is read strictly for presentation metadata, because *"every one
of those facts already exists in the shipped example. Writing them again here would create a blurb
free to drift from the thing it describes."* That file carries test-asserted `requirements:` and
`modifications:` blocks (§4 below). Reading them is the same move `readPresentation`
(`src/app/examples.ts:114-141`) already makes, under the same strict-read discipline and the same
error type — not a widening of what counts as derived.

---

## 2. The map — guidance section by guidance section

`§n` numbers are the guidance's. `B` = buildable now, `G` = gated, `R` = needs a ruling.

| § | What it asks for | | Verdict and source |
|---|---|---|---|
| 1 | Change the page's job: question-first, not format-first | **B** | The registry already leads with `question` (`src/engine/model-types.ts:340`, values at `:402`, `:426`, `:507`); the gallery card already renders it first (`src/learn/main.ts:360`). The *section bodies* were still format-ordered. Reframe is relabelling + reordering. |
| 2 | Short conceptual opening; three forms, visually, immediately | **B** | `learn.html`'s `#learn-main` intro + the existing three type sections. The three questions are the registry's, verbatim. |
| 3 | Identical four-part progression per form | **B** | All four parts already exist in `buildTypeSections` — `entry.question`, `visual`, `entry.forms` + `statements`, `entry.omits` + `purpose.omits`. They were in that order already, under format-flavoured labels, with the `combineWith` block interleaved. Pure furniture change. |
| 4 | Structure, question-first; `related`/`reachable`/`path`/`exists`/`all`/`select` | **B** | **Fully buildable — see §3.1.** All ten graph forms ship (`src/engine/types.ts:148`); `exists`/`forall` ship as query quantifiers (`:125`); `select` ships as `elements` (`src/engine/elements.ts:167`). Only `count` is absent. |
| 5 first half | Behavior's ordinary reachability questions | **B** | Six behavior forms ship (`src/engine/types.ts:155`, classified at `src/engine/model-types.ts:449-456`). |
| 5 second half | LTL surface + the four-operator table | **G** | **LTL Phase 2.** `ltl`, `buchi`, `automaton` appear nowhere in `src/` (verified; `layout-dagre`'s `defaultLayoutEngine` is the only `ltl`-substring hit). `DESIGN-v02-ltl-foundation-261004.md:427-447` enumerates seven additions, none landed. `wb-ltl-p1-261004` is in flight. |
| 6 | Witnesses AND counterexamples as a major concept | **B** | **Both halves — see §3.2.** `EvidenceRole = "witness" \| "counterexample"` (`src/ir/types.ts:649`); all three witness shapes occur on shipped saved queries; a real counterexample is computed from `document-processing` today. |
| 7 | Quantity; `sum, min, max, mean, count` | **R** | **See §5.** The operators are a *ruled-out* design, not a gap. Everything else in §7 — the four queries, units in every result, `latency + dollars` refused — is buildable and live. |
| 8 | Bindings | **G** | `DESIGN-v02-semantics-261004.md:564-608` (spec §14). Not this wave's work; see §7. |
| 9 | Composition | **G** | Spec §15, `DESIGN-v02-semantics-261004.md:610-636`. Same handoff. One cross-form composition ships (`executions-selected-by-behaviour`, `src/engine/model-types.ts:561-570`) but as a `JoinSemantics` row, which spec §14 splits. |
| 10 | Queries → properties; the BEFORE/AFTER flip | **B** | **The climax, and fully live — see §3.3.** Six declared modifications across three examples, each with its own `changes: [{query, from, to}]`, all executable through `Workspace.transact`. |
| 11 | Properties describe; requirements prescribe | **B** | **See §3.4.** Seven requirements ship in the fixtures with `satisfied_when` + `status`, both polarities represented, test-asserted. |
| 12 | "These ideas have established foundations" | **G** | **Not derivable today — see §6.** `semanticBasis` exists only as a *recommendation* in `DESIGN-v02-semantics-261004.md:1383-1430`. |
| 13 | "What the Workbench leaves out" box | **B (partly)** | The Workbench-relative half is buildable: per-type `omits` (`src/engine/model-types.ts:410-413`, `:501-504`, `:577-580`), the facade's `notSupported` (`src/app/agent-api.ts:792-799`), `ESCAPE_HATCHES` (`src/app/capabilities.ts:373`). The *SysML-relative* half the guidance actually asks for is gated with §12. |
| 14 | Humans and agents use the same models | **B** | **See §3.5.** 26 capabilities, each naming the ONE service both sides invoke (`Capability.service`, `src/app/capabilities.ts:200`); `affordanceParityGate()` reports 0 violations over 26 (`:1193`). |
| 15 | Demote `combineWith` to navigation | **B (furniture)** | `combineWith` is a *registry field* (`src/engine/model-types.ts:344-348`), so removing it is a registry change. The page can stop presenting it as semantic terminology by relabelling and relocating the block — which is all §15 asks for. The field's fate goes to the §14/§15 handoff (§7). |
| 16 | The eleven-section page order | **B** | The registry's own order is already `structural-graph`, `state-machine`, `quantitative-model` = §16's items 2, 3, 4. Items 5, 7, 8, 9 become declared sections. 6 and 10 are gated; 11 already exists as the shipped-examples route. |
| 17 | Three canonical scenarios carry the page | **B — largely already true; see §8** | `presentIn`/`presentTypes` already picks exemplars from shipped systems, so there are no toy snippets to remove. One substitution against the guidance's list. |
| tone | Remove "here are the model types MAGE supports" | **B** | The one sentence that said it was `src/learn/main.ts:180` — `"The ${label} answers it."` was fine, but the block labels around it ("Properties you can measure", "Combine with") read as a feature list. |

---

## 3. The five corrections — where the scoping I was handed under-claimed what ships

Each was checked by reading the cited symbol's definition and, where the claim was about behaviour,
by running the query. The direction of every error is the same: a capability declared gated that in
fact ships. That matters because a gated row costs the page a whole section.

### 3.1 §4's `exists` / `all` / `select` are NOT gated on spec §5 quantification

**The claim:** gated on *"spec §5 quantification"*.

**What ships.** `QUANTIFIERS = ["exists", "forall"]` at `src/engine/types.ts:125` — and not as an
internal detail. Every query arm carries one as a required field (`:269-271`), the engine *refuses to
infer* it (V21), the UI offers both as an explicit choice (`src/ui/view-model.ts:1319-1322`), and
`QUANTIFIER_EVIDENCE` (`src/engine/types.ts:129-132`) declares what each takes as evidence — the
prose a refusal is then built from, so there is no second copy. Spec §5's `select(E,P)` ships as
`elements`, whose module header says so in terms: *"the question 'which entities of type X satisfy P'
belongs to the model, so the model should answer it"* (`src/engine/elements.ts:1-18`, the operation
at `:167`). It is also a declared agent capability (`src/app/agent-api.ts:400`, derived from the
registry's `property-constraints` subject at `:351-356`).

**What the spec sentence actually means.** `DESIGN-v02-semantics-261004.md:234` reads *"Add
quantification rather than generic piping"* — in a list of eight *facade operation names*
(`:225-233`). The gap is six NAMES on `window.mage`, not the semantics. Of the eight, five ship
(`elements`, `related`, `reachable`, `path`, `violations`, `src/app/agent-api.ts:400-415`) and
`count` is the one genuinely absent thing in §4's list.

**Consequence for the page.** §4 is buildable in full, and the quantifier is better Learn material
than the operation names the guidance lists: a quantifier choice *is* the witness/counterexample
lesson of §6, arriving one section early and from a shipped declaration.

**One trap worth naming:** `select` also appears at `src/app/agent-api.ts:707` and `:895`. That is
view SELECTION — `viewState.selection = [...ids]` — and nothing to do with `select(E,P)`. A grep for
`select` finds it first.

### 3.2 §6's counterexample half is NOT gated on LTL Phase 2

**The claim:** gated on LTL Phase 2.

**What ships.** `EvidenceRole = "witness" | "counterexample"` at `src/ir/types.ts:649`, produced at
three sites in `src/quant/requirement.ts` (`:157` a lasso, `:178` and `:207` traces), and the
renderer gives counterexamples a *distinct treatment*: `src/render/accessible.ts:56` maps the role to
`"violation"`, with the legend text at `src/render/types.ts:233` and the summary sentence at
`src/render/accessible.ts:314`. V22's asymmetry is implemented too — bounded coverage downgrades a
counterexample to a candidate (`src/render/accessible.ts:50-51`).

**Verified by running it**, over the shipped `document-processing` example:

```
latency within latency-requirement  →  refuted
  magnitude  {"value":2750,"dimension":"duration","unit":"ms"}
  evidence   counterexample / trace, 13 steps
  coverage   exhaustive, 18 states
```

That is a real counterexample, of a real declared requirement, on a shipped example, with units on
the figure. The fixture pins the same numbers independently
(`examples/document-processing/expected-results.yaml:74-89`).

**And the query shape is not new machinery.** `test/learn-content.test.ts:137-145`
(`composedQuantityQuery`) already derives exactly this question from the system's own declared
ceiling, with a comment explaining why it must be derived rather than hand-written. The §6 section
reuses that derivation.

**What IS gated:** a counterexample *to an LTL formula*. `DESIGN-v02-ltl-foundation-261004.md:433-445`
lists counterexample assembly as item 6 of 7. So §6 teaches the concept today from the
quantitative-requirement path and gains the temporal case with LTL.

**A bonus the witness half gets for free.** All three evidence shapes occur on shipped saved
queries, so the section can show the vocabulary rather than assert it: `path`
(`who-publishes-order-created`), `trace` (`document-publishes`), `lasso`
(`document-returns-to-remediating`).

### 3.3 §10's BEFORE/AFTER is live, in both directions

**The claim:** buildable — *"pinned properties ship"*. Correct, and it understates it: the whole
BEFORE/AFTER demonstration is executable from shipped declarations.

Each `expected-results.yaml` carries a `modifications:` block —
`examples/message-bus/expected-results.yaml:178`,
`examples/document-processing/expected-results.yaml:436`,
`examples/worker-queue/expected-results.yaml:200` — six in total, each with a `transaction` and a
`changes: [{query, from, to}]` list. Driven through `Workspace.transact`
(`src/app/services.ts:246`), verified:

```
message-bus / restricted-data-reaches-impermitted-subscriber
  BEFORE  holds,  witness: [analytics, order-created]
  apply   drop-the-analytics-subscription  (2x delete-relation, one atomic transaction)
  AFTER   refuted
  fixture claims  from: holds  to: refuted          ✓
```

**And the guidance's own illustration direction ships too.** §10 asks to *"visually add an edge and
show BEFORE refuted ✓ → AFTER holds ✕"*. `message-bus`'s modification runs the other way (it
*repairs*). But `document-processing`'s `publish-without-validating-shortcut` adds a transition and
flips `publish-without-validating` from `refuted` to `holds` — the guidance's direction exactly, on
a shipped artifact. The page can show the author's sketch without inventing it.

### 3.4 §11 requirements are NOT gated on spec §20 — two mechanisms were conflated

**The claim:** gated on spec §20, because *"`violated` appears nowhere in `src/`"*.

The premise is nearly true and the conclusion does not follow. Three separate things were collapsed:

1. **`violated` in `src/`** — three hits, all irrelevant: `src/validator/result.ts:6` and `:119` are
   about a violated *well-formedness rule*, and `src/app/capabilities.ts:554` summarises the
   validator. So the word is indeed not a requirement status in `src/`. That much holds.
2. **The requirement mechanism** — ships. `Expectation` at `src/app/properties.ts:103-107`,
   `checkExpectation` consumed at `:446-456`, and the discriminator at `:511`:
   `kind: expectation === null ? "property" : "requirement"`. A saved query's `expect` is what makes
   it a requirement. This is spec §19's polarity discipline, implemented.
3. **Spec §20's four-valued *verification* vocabulary** — `satisfied | violated | inconclusive |
   error` (`DESIGN-v02-semantics-261004.md:787-815`) — genuinely absent as a code-level enum, and
   deliberately: `src/app/properties.ts:42-52` argues at length against minting status words the
   engine cannot produce (*"an unused status word is cheaper than a wrong one"*).

**What the page can honestly teach.** §11's actual lesson is the *polarity*, and it is shipped three
times over:

- The breach query is positive and existential, as the guidance says:
  `restricted-data-reaches-impermitted-subscriber`, `quantifier: exists`, `form: direct` with a
  cross-entity `compare` (`examples/message-bus/system.mage.yaml:479-491`).
- The requirement states the prohibition and names the outcome that satisfies it:
  `satisfied_when: refuted`, `status: violated`
  (`examples/message-bus/expected-results.yaml:43-56`).
- `test/examples.test.ts` asserts the join, so a requirement cannot claim satisfaction from a query
  that refutes it (the fixture says so at `examples/message-bus/expected-results.yaml:34-42`).

**So the word `violated` ships — in the fixtures, test-asserted — and that is a derivation source,
not prose.** Seven requirements across three examples, and *both* polarities are present:
`satisfied_when: refuted` for a breach query (message-bus, document-processing) and
`satisfied_when: holds` for a safety query
(`worker-queue`'s `processing-implies-custody`, `examples/worker-queue/expected-results.yaml:27`).
Teaching one polarity would have been a page that happened to be right; two makes the *rule* visible.

**What stays gated:** the verification *verdict* vocabulary as a typed enum, with `error` as a fourth
arm. That is spec §20 and it is not a Learn problem.

### 3.5 §14 has a stronger source than the guidance's own copy

The guidance's §14 core copy is *"An agent does not receive a separate, simplified representation of
the model. Humans and agents work through the same model semantics and query operations."* That is
UX-I1, stated as prose. UX-I1 is a *gate*: `Capability.service` names the ONE seam both sides invoke
(`src/app/capabilities.ts:192-205`, the field at `:200`), and `affordanceParityGate()` (`:1193`)
returns `"UX-I1: 0 violation(s) over 26 capabilities"` — measured, 26 of 26 both-wired, 16 distinct
services, 7 producing evidence. The section derives the claim from the gate rather than asserting it,
which is strictly better and is the whole §14 argument in one number.

---

## 4. Where the new sections' content comes from

All five are built, and every figure below is computed rather than quoted.

| New section | Anchor | Derived from |
|---|---|---|
| Witnesses and counterexamples (§6) | `question-evidence` | `QUANTIFIERS` + `QUANTIFIER_EVIDENCE` (`src/engine/types.ts:125`, `:129`); `EvidenceShape`/`EvidenceRole` (`src/ir/types.ts:648-649`); a witness and a counterexample COMPUTED from shipped examples |
| From a question to a property (§10) | `question-properties` | `expected-results.yaml` `modifications:`, applied through `Workspace.transact`; the before/after outcomes are computed, the `changes` row is the fixture's claim |
| Properties and requirements (§11) | `question-requirements` | `expected-results.yaml` `requirements:` — `statement`, `expressed_as`, `satisfied_when`, `status`; plus `Outcome` (`src/ir/types.ts:666`) and `STATUS_TEXT` (`src/app/properties.ts:67`) |
| Humans and agents (§14) | `question-agents` | `CAPABILITIES` + `affordanceParityGate()` (`src/app/capabilities.ts:498`, `:1193`) |
| What the Workbench leaves out (§13) | `question-omissions` | the registry's per-type `omits`; the facade's `notSupported` (`src/app/agent-api.ts:792`); `ESCAPE_HATCHES` (`src/app/capabilities.ts:373`) |

**The honesty property each section has.** None states an outcome. §6 and §10 *run* the queries and
render what comes back, so a section cannot claim a verdict the engine stopped producing — if
`document-processing`'s retry policy were repaired tomorrow, the §6 counterexample would become a
`holds` and the page would say so. §11 shows the fixture's `status` beside the live `Outcome`, so a
drift between them is visible on the page rather than only in CI. §14 renders the gate's own
headline, including a non-zero violation count if one ever appears.

**What the sections ended up showing, measured.** Worth recording because two of the numbers are
better than the plan expected:

- **§6** lists all four `(role, shape)` pairs the shipped corpus produces — `witness/path`,
  `witness/trace`, `witness/lasso`, `counterexample/trace` — and the test asserts the count equals
  the derived set, so a shape the examples produce cannot go unlisted.
- **§10** shows all **six** declared modifications across all three examples, and both flip
  directions: five `holds → refuted` repairs and one `refuted → holds` regression
  (`publish-without-validating-shortcut`), which is the direction the guidance's own §10 sketch asks
  for. One modification claims `holds → holds` and the table shows that too — a change that does
  *not* move the answer is the vacuous-pass lesson, shipped.
- **§11** decides all **seven** requirements live, including the two quantitative ones, and all seven
  computed verdicts agree with the statuses the fixtures record. The polarity table derives three
  distinct `(satisfied-when, answers, verdict)` rows from them.
- **§13** shows the three distinct refusal *reasons* the examples earn —
  `missing-distinction` (twice), `composition-forbidden`, `unknown-vocabulary` — each with the
  engine's own prose, which is a stronger "what the workbench leaves out" than a list of non-goals
  because a refusal names the absent distinction *and* what declaring it would take.

---

## 5. The §7 ruling — `sum, min, max, mean, count` is a rejected design, not a gap

The guidance asks for *"Operations arise naturally: sum, min, max, mean, count."*

**The three shipped quantity forms are metrics, not operators:** `latency`, `cost`, `peak_memory`
(`REQUIREMENT_METRICS`, `src/quant/requirement.ts:31`, classified in the registry at
`src/engine/model-types.ts:531-533`). `ACCOUNTED_METRICS` carries only `latency` and `cost`
(`src/ir/types.ts:468`; the type at `:466`, `peak_memory` handled separately at
`src/quant/requirement.ts:81`). Both cites in the scoping I was handed are right, give or take two
lines on the second.

**But the mismatch is sharper than "not implemented".** `src/quant/query.ts:12-16` rules the
caller-chosen aggregator OUT, by name:

> *"What a caller can NOT say is how to aggregate. The aggregation is DERIVED from the metric's
> dimension scope (§8): execution-scoped sums along executions and maximizes over them,
> configuration-scoped evaluates memory(c) per configuration and peaks over the reachable set. A
> `target` on a configuration-scoped metric is therefore a CATEGORY ERROR, refused by name, never
> computed — the §29 refinement's `max|min|named` selector stays rejected."*

So `sum` and `max` are both *present* — and neither is choosable, because which one applies is a
consequence of the dimension's declared `scope` (`DIMENSIONS`, `src/ir/types.ts:306-312`:
`duration` and `cost` are `execution`-scoped, `memory` is `configuration`-scoped). `min` and `mean`
would be new semantics. `count` is a *dimension* (`:311`), not an aggregation.

**What the page can honestly teach about quantity today** — and it is a better lesson than the
operator list, which is why this is a ruling rather than a deferral:

1. **The four §7 queries are all answerable.** *"What is the latency of this execution?"* and *"What
   is the maximum latency?"* are one question (`latency`, no `within`, `exists` → worst case over
   the selected executions, with a witness). *"What is the total model cost?"* is `cost`. *"Are all
   successful executions under two seconds?"* is `latency` + `within:` a declared ceiling + `forall`.
   The quantifier is *forced* by the question's shape and a mismatch is refused
   (`src/quant/query.ts:153-168`).
2. **Units are visible in every result, by type.** `ResultMagnitude` carries `{value, dimension,
   unit}` (`src/ir/types.ts:687-691`) and the comment says why: *"a bare number lets a consumer add
   milliseconds to megabytes."* Measured: `2750 ms`, `384 MB`.
3. **`latency + dollars` is refused, and the refusal is quotable.** This is §7's compact
   typed-semantics lesson and it needs no invention — asking `latency` against a memory ceiling
   yields, live:

   > `'within' names 'peak-memory-requirement', which declares dimension 'memory', and 'latency'
   > accounts duration. Comparing a duration total against a memory ceiling is the cross-dimension
   > arithmetic V30 refuses in the model, refused here for the same reason.`

4. **Aggregation is derived from the dimension, not chosen.** State that, and §7's *"nonsense is
   rejected merely because both values happen to be numbers"* point lands twice — once on the
   dimension crossing, once on the aggregator.

**Not invented, and not recorded as a follow-up either.** Adding `min` / `mean` / a caller-chosen
aggregator would reverse a ruling in `src/quant/query.ts`. If the author wants them, that is a
semantics decision for the quantity layer, not a Learn gap.

**One scope note the guidance should hear.** §7 lists *"latency, memory, dollars, requests, tokens,
energy, where appropriate"* as the breadth of "cost". Three ship — `duration`, `memory`, `cost` —
plus `ratio` and `count` (`src/ir/types.ts:306-312`). `requests`, `tokens` and `energy` are not in
the closed dimension table, so the page must not list them. "Deliberately broad" is honest at three
dimensions; naming six would not be.

---

## 6. §12 is not derivable today, and that is a definite answer

**Assessed, and the answer is no.** The §35 mapping table exists
(`DESIGN-v02-semantics-261004.md:1348-1381`) with per-row attribution classes — `borrowed`,
`extension`, `extension, externally grounded`. §35.5 (`:1383-1430`) then *recommends* two homes in
the registry: `ModelType.semanticBasis` and `QueryPrimitive.semanticBasis`, with cited line numbers.

**Those line numbers point at the interfaces the field would go ON, not at the field.** `:258` is
`export interface QueryPrimitive`, `:338` is `export interface ModelType`, `:139` is
`export const MODEL_TYPES` — all three read today exactly as §35.5 describes their *neighbourhood*,
and none contains `semanticBasis`. Verified directly: `semanticBasis`, `semantic_basis`, `SysML` and
`KerML` appear **nowhere** under `src/` or `test/`. §35.3 says so itself (`:1333-1339`): *"The
current state of the code is zero attribution, not over-attribution."*

So a derived §12 would have nothing to read. The honest options were:

- **Hand-write the §12 prose from the table.** Refused — this is exactly the hand-written capability
  prose UX-I9 forbids, and it would claim standards grounding on the page while `src/` claims none.
- **Add `semanticBasis` to the registry.** Out of scope: `src/engine/model-types.ts` is owned by
  `wb-joins-census-261004` this session. Recorded in §7 below.
- **Omit §12 and say why.** Taken.

**It is worth doing, and it is a small, well-specified change.** §35.5 already supplies the union
shape, the two homes, and a three-rung enforcement assessment whose conclusions are unusually clean:
rung 1 (presence) is the *compiler*, because the field lives on the object it describes; rung 2
(non-placeholder content) is a test mirroring the one the `by-construction` gates already have
(`test/model-types.test.ts:174-177`); rung 3 (that the correspondence is *right*) is `asserted` and
cannot be mechanised. Once it lands, §12 becomes derivable in the strongest available form — a
section built from the registry, with `extension` rows visibly *not* attributed to SysML, which is
§35.3's symmetry requirement rendered rather than promised.

**And it would upgrade §13 too.** The guidance's §13 box is SysML-*relative* (*"SysML v2 and KerML
support substantially richer modeling than the Workbench exposes"*). That half needs the same field.
What ships today supports only the Workbench-relative half, which is what §13 is built from here.

---

## 7. Registry and spec changes the reframe needs — recorded, not made

`src/engine/model-types.ts` is owned by `wb-joins-census-261004` for this session. Nothing below was
implemented.

1. **`[DESIGN]+[FIX]` — `ModelType.semanticBasis` + `QueryPrimitive.semanticBasis`.** Lands §12 and
   §13's SysML-relative half as derived content. Shape, placement and the three enforcement rungs are
   fully specified at `DESIGN-v02-semantics-261004.md:1383-1430`; no design work remains. Highest
   value of anything on this list, because it converts a whole guidance section from prose-or-nothing
   into derivation.
2. **`[DESIGN]` — spec §14's bindings/compositions split.** `combineWith`
   (`src/engine/model-types.ts:344-348`) and `JoinSemantics` (`:176-186`) are the two registry objects
   spec §14 reorganises: `appears-in` and `machine-of-entity` become explicit *bindings*;
   `executions-selected-by-behaviour` becomes a *composition*. **Guidance §8, §9 and §15 are the
   same work as that split, and this wave did not implement it.** Learn's §8/§9/§15 sections should
   follow it, not precede it — a Learn page teaching "binding" before the registry has one would be
   the hand-written prose UX-I9 forbids, and §15's *"remove `combineWith` as semantic terminology"*
   is a registry rename this wave cannot make.
3. **`[DESIGN]` — does `questions` want a second phrasing?** The registry's `question` fields are
   already the guidance's three questions nearly verbatim (`:342`, `:426`, `:507` vs guidance §2), so
   **no change is needed** — recorded so the next wave does not go looking. The one divergence is
   cosmetic: the registry says *"What behaviour can occur over time?"*, the guidance *"What can
   happen over time?"*. The registry's is more precise; leave it.
4. **`[AUDIT]` — `src/learn/content.ts`'s header lists four derivation sources and there are five.**
   The fifth — `expected-results.yaml`, via the `src/app/examples.ts:12-29` precedent — is now used
   by three sections. The header was updated in this wave; flagged here in case the canonical list
   belongs somewhere a lint can read it.
5. **`[FIX]` — `DESIGN-v02-semantics-261004.md:1402-1410`'s line cites read as present-tense.**
   §35.5 cites `src/engine/model-types.ts:258` / `:338` / `:139` for a field that does not exist. The
   surrounding prose is correctly conditional, but the cites invite exactly the misreading that cost
   this wave a round of verification. Suggest marking them `(proposed)`.

---

## 8. §17 — largely satisfied already, with one substitution

**Mechanically, yes.** The page has no toy snippets to remove. Every visual is
`exemplarFor(typeId, systems)` (`src/learn/content.ts:148-156`) — the first shipped example whose
system satisfies the registry's own `presentIn`, then that system's first declared subject — and
`test/learn-content.test.ts:59-77` refuses a type whose visual is null, with the stated reason that
*"a Learn card with no real visual would have to be an illustration, which UX-I9 forbids."* So §17's
*"rather than lots of disconnected toy snippets"* is already structurally guaranteed.

**Which three scenarios it picks, measured:**

| Guidance §17 wants | `presentIn` picks | |
|---|---|---|
| Message bus → Structure → reachability → witness → security requirement | `message-bus` / `data-policy` | matches |
| Transaction/workspace → Behavior → LTL → counterexample → structural binding | `document-processing` / `document-lifecycle` | **substitution** |
| Processing pipeline → Quantity → behavior/quantity composition | `document-processing` / `pipeline-performance` | matches |

`message-bus` declares no machines, so the behavior exemplar falls to the next shipped example. **No
transaction or workspace example ships** (`docable.mage.yaml` sits at `examples/` root and is not in
`SHIPPED_EXAMPLE_IDS`, `src/app/examples.ts:60`).

**The substitution is an improvement, not a shortfall**, and the reason is §17's own goal — *"by the
end, students have encountered three systems several times and watched the questions get richer."*
Because `document-processing` carries Behavior *and* Quantity, the behavior→quantity composition the
guidance assigns to its third scenario happens *within one system* the student already knows. On the
guidance's split it would span two. The §6 counterexample, §7's every figure, and §9's composition
all land on `document-processing`'s single pipeline.

**So §17 needs no work beyond what §16's reordering already does.** The one thing the reframe adds is
making the recurrence *visible*: §6, §10, §11 and §13 all name the example they computed from, so a
reader sees `message-bus` and `document-processing` return rather than meeting three unrelated
figures.

---

## 9. What this wave built

Per deliverable 2 — the reframe, which is the valuable part and is available today.

1. **`src/learn/questions.ts`** (new) — five declared-but-derived question sections, in the shape
   `workbench-guide.ts` established for declared sections, with one addition: every section carries
   `derivedFrom: readonly SchemaAuthority[]`, the registry's own citation shape, so a section's
   capability claims are checkable the way a type card's are — and the citations are *rendered*, so a
   reader can open the authority rather than trust the page. Content is computed at render time, and
   the builder switch is exhaustive over the declared anchors by the compiler, so a section declared
   with no builder is a type error rather than a blank `<section>`.
2. **`src/learn/fixtures.ts`** (new) — a strict typed reader for `expected-results.yaml`'s
   `requirements:` and `modifications:` blocks, extending the `readPresentation` pattern
   (`src/app/examples.ts:114`) with the same `ExampleMetadataError` discipline. The page fetches the
   fixtures in the same wave as the systems.
3. **`src/learn/main.ts`** — §3's four-part progression made explicit, its labels declared once in
   `PART` because the repetition across the three forms is the pedagogy; §16's ordering;
   `combineWith` demoted from a mid-section semantic block to a "Try next" pointer after the
   progression (§15); the question sections rendered after the gallery and before the guide; a
   second nav beside the gallery's, so the reframe's sections are reachable by name.
4. **`src/learn/content.ts`** — header updated to name the fifth derivation source and its
   precedent, and `composedQuantityQuery` extracted here from `test/learn-content.test.ts` on the
   second caller. It gained an optional `ceilingId` so a requirement can be decided against *its
   own* declared ceiling: the two quantitative requirements shipped are of different dimensions, and
   the first-ceiling default would have decided both against the wrong one.
5. **`test/learn-questions.test.ts`** (new, 17 tests) — one claim per section plus three structural
   ones. No outcome word appears as a literal: every assertion re-derives the fact from the same
   source and compares. The strongest is the page-vs-fixture join — every requirement's LIVE verdict
   must agree with the status its fixture records, so the section cannot show a requirement as
   satisfied beside a query that refutes it.

**One defect found and fixed at the a11y gate, which is the gate doing its job.** The counterexample
readout first landed as a two-column `rows` block with empty header cells, and axe reported
`empty-table-header` on `learn.html` in two of its three states. The fix is at the block type rather
than at the markup: a term-and-value readout is a description list, so `QuestionBlock` gained a
`pairs` arm rendered as `<dl class="prov">` — the spelling the page already uses for citations. A
table whose header row carries no information is a layout table wearing data markup, and giving the
columns invented names would have hidden that rather than fixed it.

**No derivation test was weakened.** Two test files were touched and neither assertion changed:

- **`test/learn-content.test.ts`** — its local `composedQuantityQuery` now calls the shipped
  derivation and keeps its own `assert.ok` wrapper. This is a *strengthening*: the page and the
  test now derive the composed question identically, so the test's proof covers the shape the page
  actually renders. It also retired a hardcoded `?? "peak_memory"` fallback (rule-#42 shaped) in
  favour of deriving "the metric that accounts no dimension".
- **`test/browser/smoke.test.mjs`** — `QUESTION_ANCHORS` joins `GUIDE_ANCHORS` in the expected
  section set, which is the precedent that file's own comment sanctions for declared non-gallery
  sections. **The GALLERY claim is untouched**: `cardHrefs` still `deepEqual`s the registry's type
  and use anchors exactly, so the 1:1 correspondence between cards and registry rows is as strict
  as it was, and no question section can stand in for a missing model-type entry.

**Gates, measured after the change:** `check` clean, `check:parity` 0 violations over 26
capabilities, node **982** (baseline 965, +17) with **0 skipped**, `build` clean, smoke 3, browser
**114**, a11y **112**. Every tier at its baseline.
