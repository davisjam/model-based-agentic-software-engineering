# P3 — Embedded Sensor Node: the gap between the five steps and what ships

**Scope.** §11 of `DESIGN-v02-examples-and-semantic-completion-261004.md`, **Phase 1 only**. The
behaviour-dependent peak-memory extension (§11.5's Q7–Q9) is P4 and is not touched here.

**Method.** Every `file:line` below was read with its surroundings. Two throwaway probes were run
and are reported in §2.3 and §5; neither was committed.

**Baseline, measured in this worktree at `e4856fef` before any change.**

| Gate | Result |
|---|---|
| `npm run check` | clean |
| `npm run check:parity` | `UX-I1: 0 violation(s) over 26 capabilities` |
| `npm run test` | 1140 pass, 0 fail, 0 skipped |
| `npm run build` | `dist/workbench.js + dist/analysis.worker.js + dist/learn.js` over 87 inputs |
| `npm run test:browser` | 115 pass, 0 fail |
| `npm run test:a11y` | 112 pass, 0 fail |

---

## 1. The aggregation question — the reading holds, and by three independent routes

§7.1 of the guidance asks for `value, sum, min, max, mean, count`. The shipped quantitative design
fixes aggregation per form: *"There is no aggregation parameter, and that absence is the design"*
(`SEMANTICS.md:734`), reasoned from `max|min|named` not reappearing **as a query field**, and from
executions being possibly infinite.

**Tested, and the two do not conflict.** Three separate reasons, each from the ruling's own text:

1. **The ruling's domain is executions and the reachable configuration set, not the declared
   annotation map.** `SEMANTICS.md:738-741`: *"What a caller may select is which executions
   (`target:`…) — paths and traces stay distinguished from analyses over them."* The enforcement is
   `src/quant/query.ts:106-114`, which refuses a `target` on a configuration-scoped metric *because*
   *"a target selects executions, which is the axis a configuration-scoped quantity does not
   aggregate along."* P3's Q1–Q3 range over `system.quantities` — a finite map, fully read. Neither
   executions nor configurations appear.
2. **The shipped design already rules aggregation over the finite declared domain well-posed.**
   `DESIGN-v02-quantification-261004.md` §3.2: *"`select`'s cardinality over the entity table is
   finite and exact, because the entity table is finite and fully read."* §4.5 partitions `count` the
   same way — *"well-posed only over the finite domains — entities (exact) … Over executions it is
   ill-posed."* So the design does not merely fail to govern this domain; it has already licensed
   exactly this kind of aggregation over it.
3. **The ruling's shape constraint is also satisfied, which is the part a domain argument alone would
   miss.** The prohibition is on a caller-chosen aggregation *field*. A readout named `total`,
   `largest` or `margin` fixes its aggregation **by its own name**, derived from what is being read
   — which is the ruling's actual reason (*"the aggregation follows from what is being measured"*,
   `DESIGN-v02-quantification-261004.md` §4.5), not an exception to it. `QuantityQuery` gains no
   field. The `max|min|named` selector stays rejected.

**And the design already supplies the test that places these readouts.**
`DESIGN-v02-quantification-261004.md` §3.4 draws the line at *does it make a claim?* — `select` and
`count` answer "what is there" and return data; `exists` and `all` answer "is this true" and return a
verdict with evidence. Total, largest and margin answer "what is there". So they are **not forms**:
they owe no quantifier, no `Outcome`, and no `Evidence`, and they never reach `parseQuery` or the
dispatcher. They are the `elements`/`count` family — a subject enumeration with a derived readout.

**Ruling taken here, and the execution ruling is untouched.** Aggregation over declared quantities
lands as readouts in `src/quant/`, reached through the facade's non-form subject arm. Nothing is
added to `QuantityQuery`, no `target` is admitted on a configuration-scoped metric, and
`src/quant/query.ts:106-114` is not relaxed.

**What is deliberately NOT shipped from §7.1's list, on the design's own grounds.** `min` and `mean`
over declared allocations are arithmetically well-defined but answer none of §11.4's six questions,
and "the average allocation size" carries no engineering decision. `DESIGN-v02-quantification-261004.md`
§4.5 already records them as *"absent, and no stated question needs them"*. Shipping them would be a
menu, which is the framing that document recommends against.

---

## 2. The gap list — the five steps against what ships

### 2.1 The table

| Done-condition step | Ships today? | Verdict |
|---|---|---|
| **1.** See allocations and the 256 KiB budget **clearly** | **No, and in three separate ways.** | **Construction** |
| **2a.** Total (Q2) | Answerable, by one encoding, phrased as something else | **Assembly, with an honesty gap** |
| **2b.** Maximum — which allocation is largest (Q1) | No | **Construction** (small) |
| **2c.** Margin below the budget (Q3) | No | **Construction** (small) |
| **3.** Check the memory-budget property (Q4) | **Yes, end to end** | **Assembly** |
| **4.** Double a queue / modify an allocation (Q5) | **No. There is no operation for it.** | **Construction** |
| **5.** See the quantitative answer and the property change | Follows from 1 and 4 | **Assembly, once those exist** |

### 2.2 Step 1 fails three ways, and only the third is a renderer question

- **No addressable subject.** `system.quantities` is a flat top-level map keyed by quantity id
  (`src/ir/types.ts:602`); each `CanonQuantity.target` points at some other construct
  (`:530-532`). There is no `CanonQuantitativeModel`, so there is nothing a renderer could be
  handed. This is the sibling design's finding (`DESIGN-render-rules-261004.md` §F) and it is
  correct.
- **No surface in the workbench at all.** Not a poor rendering — none.
  `src/ui/shell/inspector.ts:195-196` states it: *"the quantitative type is reachable from no
  selection at all, because a quantity is not selectable — `SelectionRef` has no member for one."* A
  tree-wide search for `quantit` across `src/ui/` returns two comments and no code.
- **The forbidden fallback, on the one surface that does show something.** The Learn page routes the
  quantitative type to the **structural** extractor over a subject chosen positionally — first
  `model:`-targeted quantity's referent, then the system's first model, then its first machine
  (`src/learn/content.ts:174-180`) — then prints the quantities as a four-column table beneath it
  (`src/learn/main.ts:275-281`). §22.4 forbids a generic fallback for a registered model type and
  §22.3 forbids forcing quantities into the structural renderer.

### 2.3 Step 2a ships under a different name, and the figure is unreadable

Probed. A system with no machine, every allocation `residency: resident`, and a `model:`-targeted
budget:

```
machines: 0 instances: 0 quantities: 3
MEASURE: outcome holds | cov exhaustive(1) | mag { value: 0.1015625, dimension: memory, unit: MB }
DECIDE:  outcome holds | cov exhaustive(1) | mag { value: 0.1015625, dimension: memory, unit: MB }
```

So `peak_memory` with no machine explores exactly one configuration and the peak of `memory(c)` over
it **is** the sum of every resident allocation. Q2 is answerable today.

Two honesty gaps, both real:

- **The phrasing describes a different question.** The interpretation sentence reads *"What is the
  peak memory(c) over reachable configurations?"* (`src/quant/query.ts:289`). That is a true
  statement and not the student's question. Q2 asks for the total of the declared allocations, and in
  Phase 1 the two coincide only because there is one configuration. A reader who learns Q2 as
  `peak_memory` learns a coincidence.
- **`0.1015625 MB` is not a legible answer to a 256 KiB question.** The base unit for `memory` is
  `MB` (`src/ir/types.ts:308`), so every figure reaches the surface as a fraction of a megabyte. The
  projection must derive its display unit from the declared magnitudes' written units, not from the
  base.

### 2.4 Step 3 ships, end to end

`kind: quantity`, `quantifier: forall`, `metric: peak_memory`, `within: <model:-targeted memory
quantity>`. The ceiling is resolved against the declarations and refused by name if it is not a
`model:` total or its dimension differs (`src/quant/query.ts:116-151`), the quantifier is forced
(`:156-169`), and `evaluatePeak` decides it. Probed green above. This step is pure assembly: declare
the budget quantity and save the query.

### 2.5 Step 4 does not work, and this is the sharpest gap

`Operation` is a closed union of fifteen members (`src/transaction/types.ts:47-104`):
`set-label`, `set-property`, `add-entity`, `delete-entity`, `add-state`, `delete-state`,
`add-transition`, `delete-transition`, `add-relation`, `delete-relation`, `set-purpose`, `add-model`,
`delete-model`, `add-note`, `save-query`, `delete-query`. **None addresses a quantity.** There is no
UI form (`src/ui/shell/edit-dialogs.ts:53-55` lists the same vocabulary), no agent operation, and no
`window.mage.transact` route.

So the modify→recheck loop that works for a structural pin — change a property, re-ask the saved
query, watch the verdict move — has **no quantity analogue**. Q5 ("what happens if telemetry queue
depth doubles? Modify the model and recheck") is the example's pedagogical centre, and the modify
half is absent.

---

## 3. What this wave builds

Smallest-sound-first, each piece independently landable.

1. **`CanonQuantitativeModel`, derived.** The addressable construct §F requires. `CanonicalSystem`
   gains `quantitativeModels: ReadonlyMap<string, CanonQuantitativeModel>`, keyed
   `<hostModel>:<dimension>`, derived in `canonicalize` from the declarations — the `model:`-targeted
   quantity supplies the budget and names the host, and membership is the evaluator's own already
   shipped rule.
2. **`src/quant/budget.ts` — the readouts.** `total`, `largest`, `margin`, `count`, per-allocation
   rows, each magnitude in base units with its declared written form retained. No `QuantityQuery`
   field.
3. **`src/render/budget.ts` — the projection.** Allocations as a stacked bar against the budget line,
   with an indivisible accessible twin, following `renderView`'s contract
   (`src/render/index.ts:4-6`). **Not** a third `SceneSubject` arm: a budget is not a node-link
   scene, and routing it through `buildScene` + dagre + `buildAccessibleScene` is the §22.3
   prohibition in the other direction.
4. **`examples/embedded-sensor-node/`.** Deterministic fixtures per §11.3, a `model:`-targeted
   budget, a pinned requirement, and saved queries.
5. **Tests** at each layer, plus the example's `expected-results.yaml` driven by `test/examples.test.ts`.

### 3.1 Why the derived construct is not the positional fallback in new clothes

The fallback's defect is that it chooses by **position** — first model, then first machine — which
has no declarative warrant. Every step of the derivation here cites a shipped declaration:

- a `model:`-targeted quantity already **is** a declared total, *"exempt from every accounting
  basis"*, and its `target.ref` names the host model (`src/quant/query.ts:127-134`);
- membership already **is** the evaluator's rule — `memoryContributions` selects quantities by
  `dimension` and accountable `target.kind` and nothing else (`src/quant/memory.ts:40-41`).

So the grouping is not invented; it is extracted from two sites that already compute it implicitly.
A derived field on `CanonicalSystem` has a precedent in the same file: `instances: expand(mach)`
(`src/ir/canonicalize.ts:568`). Like `instances`, it stays out of the hash, because it is a function
of what is hashed (`src/ir/hash.ts:58-95` enumerates the hashed fields explicitly).

**What this is NOT.** It is the *addressable construct* half of §F's step 1, not the authored half.
Scoping quantities under a `quantitative-models:` block in the wire schema — and moving `accounting:`
inside it, which `src/ir/types.ts:606-611` anticipates — changes `mage-model.schema.json` and the
published-schema gate, and is deferred.

---

## 3.2 What shipped, against the five steps

Measured on the final tree: `check` clean, `check:parity` 0 violations over 26 capabilities, `test`
1214 pass / 0 fail, `build` over 91 inputs, `test:browser` 120 pass, `test:a11y` 112 pass.

| Step | Shipped | Where |
|---|---|---|
| **1.** See the allocations and the budget clearly | **Yes**, on two surfaces | A budget region in the Workspace (`#model-budget`), and the quantitative Learn card |
| **2a.** Total | **Yes** | `budgetReadout.total`, on both surfaces, in the declared unit |
| **2b.** Largest allocation | **Yes** | `budgetReadout.largest`, named in prose beneath the table |
| **2c.** Margin | **Yes**, with its percentage | `margin` / `marginFraction`; §11.4's Q6 asks its 20% question in the second |
| **3.** Check the budget property | **Yes** | `sram-fits-budget`, a saved `forall` + `within` query, pinned in `expected-results.yaml` |
| **4.** Double a queue | **Yes** | `set-quantity-value`, the sixteenth operation, driven by the example's `modifications:` block |
| **5.** See the answer and the property change | **Yes** | The fixture drives holds → refuted; the readout's margin goes 24 KB → −8 KB with it |

### The example's figures

232 KB over nine allocations against a 256 KB ceiling — 9.375% margin. `model-weights` is the
largest single allocation at 72 KB, 31% of the budget on its own. Doubling `telemetry-queue-sram`
from 32 KB to 64 KB takes the total to 264 KB and refutes the pinned requirement by 8 KB. Halving
the classifier's weights to 36 KB restores 23.4% margin, while dropping the logging buffer and
halving the radio stack reaches 19.5% and does not — which is what makes §11.4's Q6 a search.

### Five defects the gates found, all in shipped code rather than in this wave's

1. **`groundsFor` had no `quantity` arm**, so a quantitative property reached ESTABLISHED citing no
   model at all — UX-I5's exact prohibition. Invisible because no shipped example had ever declared a
   saved `kind: quantity` question. It now cites the ceiling's host and the allocations' models, with
   different reasons for each kind of dependence.
2. **The agent context reported no quantity counts**, so an agent reading
   `window.mage.context().counts` could not tell a system with a resource budget from one without —
   and the quantitative question is exactly the one it would then not think to ask.
3. **WCAG 2.4.3 on `learn.html` at 576px.** The card's shipped-example links were a comma-separated
   inline run; at four they fit on a line and the fifth made them wrap, putting several tab stops on
   one visual row. Fixed as a class — one link per row cannot invert — so the next example cannot
   reopen it.
4. **WCAG 1.4.10 at 320px**, twice over. The inert-allocation reason was a sentence in a table cell,
   which sized the first column to 259px; and `learn.html`'s own stylesheet sets a 34rem min-width on
   every table, which survives `width: 100%` and `table-layout: fixed` alike. The page rule is
   harmless for the tables it was written for — they sit inside a closed `<details>` the reflow walk
   does not measure — and is a latent hazard for the next table that does not.
5. **The `derived-values` lint's cardinality floor stopped carrying an exclusion its own header
   declared.** `SHIPPED_EXAMPLE_IDS` was kept out of count-policing by having four members; the fifth
   let its count match five unrelated assertions and zero true positives. The exclusion is declared
   now, and a new pin fails any source left out by arithmetic alone.

A sixth was mine: the browser probe read a context field that does not exist, so its row-count
assertion never ran. It asserts its denominator is non-vacuous before dividing by it, which is what
surfaced finding 2.

---

## 4. Deferred to P4, named

- **§11.5's Q7–Q9** — peak memory over modeled operating behaviour, the per-mode fit, and the
  responsible mode as evidence. Needs operating states and `when:`-charged allocations; the
  machinery exists (`src/quant/memory.ts` charges the `when` summand already), but §11.6 requires
  the resource-lifetime semantics to be designed and registered first, and that is a Behavior →
  Quantity composition question.
- **§11.4's Q6** — "which change restores at least 20% SRAM margin". A design activity over a margin
  readout, and it needs step 4's modify path before it can be an activity at all.
- **The authored quantitative-model block**, per §3.1 above.
- **A `set-quantity-value` dialog in the UI.** The operation ships on the transaction vocabulary and
  the wire schema, so the agent path and the fixture path both drive it; a human reaches it through
  `window.mage.transact` rather than a form. The ten editing dialogs are a declared affordance set
  with a parity gate behind them, and adding an eleventh is that gate's work rather than this one's.
- **The render-strategy registry** of `DESIGN-render-rules-261004.md` §B. This wave built the
  projection the registry would declare and left the registry to its own Epic — but it also answered
  that document's open question 1 by construction: the quantitative arm is `projected` now, not
  `annotates`, so the arm that would have recorded today's fallback honestly has nothing left to
  record.

---

## 5. What the spec, the directive and the brief got wrong

1. **The unit the spec asks for does not exist, and the one that does is spelled ambiguously.** §11.2
   says 256 KiB. The memory dimension's unit table is `{ KB: 0.0009765625, MB: 1, GB: 1024 }`
   (`src/ir/types.ts:308`), so there is no `KiB` token — a `256 KiB` literal refuses with
   *"quantity 'sram-budget' has no normalized magnitude ('256 KiB'); run validation (V28)"*, probed.
   The table's `KB` is **binary**: `0.0009765625 = 1/1024`, so `256 KB` is exactly 262144 bytes,
   which is the budget the spec means. The example therefore authors `KB` and says why.
   **This is a latent labelling defect worth the author's attention:** the table computes kibibytes
   and calls them kilobytes, which is the JEDEC spelling the IEC prefixes exist to disambiguate. The
   fix is a unit rename across the published schema, the unit pins and every example — not this
   wave's, and not an agent's call.
2. **The brief's "`system.quantities` is a flat annotation map with no addressable model" is right,
   and its citation is one construct off.** `src/ir/types.ts:606-608` is the comment on
   `CanonicalSystem.accounting`, which says the *accounting* declaration moves when quantities are
   scoped. The flat map itself is `:602`. The sibling design cites `:606-608` for the same reason,
   and the anticipation it quotes is real — but the field the scoping has to add sits beside
   `quantities`, not where the comment is.
3. **The brief says the generic fallback "already ships — the quantitative type routes to the
   structural extractor over a positionally-chosen subject." Half of that is sharper than stated and
   half is softer.** Sharper: the workbench shows nothing about quantities at all, so the fallback is
   not the worst of it (§2.2). Softer: the first of the three fallback branches is **declaration-driven**
   — it reads a `model:`-targeted quantity's referent (`src/learn/content.ts:176-178`). Only branches
   two and three are positional. The honest statement is that the route is declared and the
   *projection* is wrong: a declared subject, drawn by the structural extractor.
4. **The spec's §11.4 Q2 and the shipped `peak_memory` coincide only in Phase 1** (§2.3). Writing Q2
   as a `peak_memory` measurement teaches a student that the total of declared allocations *is* the
   peak, which §11.5 then has to un-teach — and un-teaching it is precisely §11.5's purposeful-reduction
   moment. So the two questions must be asked by two different surfaces, or the example's own climax
   is spoiled by its setup. **Resolved that way:** the total is a readout and the budget decision is
   the one saved query, which is also the §3.4 claim-versus-data line the quantification design draws.
5. **§11.7 asks the example to exercise "Behavior → Quantity composition", and Phase 1 cannot.** The
   acceptance list mixes Phase 1 and §11.5 obligations without saying so, and §11.6 forbids reaching
   for the second before the composition is designed and registered. Of §11.7's nine items, Phase 1
   exercises seven — quantity, units, sum, max, requirement, margin, purposeful omission — and defers
   the composition and the model expansion. Read as a Phase 1 checklist the list fails; read as the
   example's whole arc it passes. The section should say which.
6. **The fixture's quantitative-expectation schema cannot express a sub-megabyte model.**
   `expected_mb`, `resident_mb` and `when_charged_mb` are each read as a positive integer, so 232 KB
   has no spelling there that is not a rounding. The example's hand-derived oracle therefore lives in
   `test/quantitative-model.test.ts`, where it re-derives the sum from the declarations rather than
   restating it, and the budget requirement is joined by `expressed_as` rather than `decided_by`. A
   schema that admits a unit-bearing literal — the form every other magnitude in this project takes —
   would close it.
7. **Two shipped invariants constrain an example the specification describes as single-model.** §11.2
   lists components and one 256 KiB budget; EX-I2 requires two purposeful models, a shared identity
   and a question needing both, and §2 requires three to five suggested questions. Both are
   reasonable and neither is visible from §11. The example gained a second purposeful model — a data
   path carrying no magnitude — which turned out to improve it: the cross-model question *"does an
   optional component feed an essential one?"* holds, and its witness is the optional classifier
   feeding the essential transmit path, which also owns the two largest allocations. That is a
   finding about the design rather than a formality, and §11 did not ask for it.
