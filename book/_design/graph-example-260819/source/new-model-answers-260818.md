# Source-grounded field note — the DocAble remediation-graph substrate

*Answers to the 15 investigation prompts in `new-model.md`. Every substantive claim
carries a repository receipt (`file:line` / symbol) the reader can check. Status tags
per the requested taxonomy: **SHIPPED** (on main, tested) · **MERGED** (on main, light
coverage) · **IN-PROGRESS** (foundation landed, wiring pending) · **DESIGNED** (design
doc only) · **PROPOSED** (floated, no design). Verified against `main` @ HEAD on
260818; the model was executed live to confirm counts and well-formedness.*

> **Read-me-first honesty header.** The single most important correction: the substrate
> is a **read-only, inert projection model** in `system-models/` — Python metadata never
> imported by the runtime. It does not *execute* the pipeline; it *names* it. The four
> attribute providers ARE landed and tested. The determinism **seed** is the load-bearing
> IN-PROGRESS item: the helper + client plumbing exist, but no structural pass call site
> passes a seed yet, and the 260819 baseline measured **20/20 structural nodes over budget**.
> Model-selection (Phase 9) is DESIGN-ONLY and its attribute name is **not even declared**
> in the code yet. Details throughout; consolidated fact table at the end.

---

## How the pieces map to the book's framing

- The "computation/task graph" = `system-models/remediation_graph.py` (1194 lines).
- Nodes = remediation **passes**, not GenAI calls. 113 nodes total (live-counted):
  56 PDF + 26 PPTX + 18 DOCX + 13 XLSX. By color: 62 `algorithmic`, 37
  `genai-structural-deterministic`, 14 `genai-descriptive-creative`.
- "Attribute providers" = a **side-table registry** (`AttributeProviderRegistry`,
  `remediation_graph.py:790`) — providers are keyed by `NodeId`, **not fields on the node**.
- The book's Measurement-model reading is sound: the two flagship measured properties are
  **complexity** (deterministic nodes, `remediation_graph_complexity_provider.py`) and
  **determinism-tolerance** (GenAI nodes, `remediation_graph_tolerance_provider.py`).

---

## 1. The originating complexity incident — the ~322 s single-page stall

**Status: MERGED** (fix landed + validated by pin test; the 322 s figure itself is a
field-note recollection, see caveat).

- **What stalled / responsible symbol.** A content-stream edit path in
  `backend/src/AdaTool.PdfModel/Primitives/PdfPageContentScanner.cs` (file exists;
  verified). The field note (`docs/field-notes/remediation-graph-substrate-journey-260818.md:20-28`)
  records "~322 s pure-CPU single-page stall, root-caused to an `O(R²)`
  rescan-per-mutation in `PdfPageContentScanner` — every content-stream edit re-scanned
  the whole token stream instead of patching it in place." **`PdfPageContentScanner` is the
  correct name** (receipt: the `.cs` file at that path).
- **The pathology.** `O(R²)` where **R = number of content-stream edits (mutations)
  applied to one page's token stream**; each mutation re-tokenized/re-scanned the entire
  stream, so R edits × O(R) rescan = O(R²). This is the canonical "per-item full-collection
  re-walk inside a loop whose iteration count scales with document size" shape the whole
  audit then hunted (`journey:26-28`).
- **The fix.** Batch edits into a **piece buffer, materialize once** — landed as
  `backend/src/AdaTool.PdfModel/Primitives/PdfContentEditBuffer.cs` (file exists; verified).
  The field note names it `PdfContentEditBuffer` / `StreamPieceBuffer` (`journey:23-25`).
  "Batch edits into a piece buffer, materialize once" is **technically accurate** as the
  fix shape.
- **Measured before/after — CAVEAT.** The **322 s** number is a field-note recollection,
  not a retained benchmark artifact in the tree. Treat "~322 s" as *inferred/remembered*,
  and the asymptotic characterization (`O(R²) → O(R)`) as the *load-bearing* claim. The
  book should present the asymptotics as the fact and the 322 s as illustrative colour.
  Distinguish measured (the *ratio* probes of prompt 3/4, which ARE retained) from the
  single stall figure (not retained as a committed measurement).
- **Receipts:** `PdfPageContentScanner.cs`, `PdfContentEditBuffer.cs` (both present);
  `journey:18-28`; seed audit `scratchpad/walker-complexity-audit-260817.md` (cited by the
  field note `journey:31-33`, `:360`).

---

## 2. Generalization into the complexity audit — S1/S2/N1/N2

**Status: mixed** — the *directive* and *audit* SHIPPED; S1/S2 **fixes SHIPPED**; N1/N2
and the rest **DESIGNED/queued** (identified, not yet fixed).

- **The directive.** "Repair the probably-non-optimal algorithms" (`journey:30-31`) — the
  incident reframed as a recurring **defect class**: *a per-item full-collection
  rebuild/re-walk inside a loop whose iteration count scales with document size*
  (`journey:26-28`). Your paraphrase of the intended pattern is **accurate**.
- **The Epic.** `remediation-graph-complexity-model` (docs dir verified:
  `main.md`, `phase-1-design-260817.md`, `phase-1b-review-260818.md`, `phase-2-260818.md`,
  `phase-2b-probe-falsification-260818.md`).
- **What it inspected / found.** The v2 PDF-structure path, the vision-primary
  projector/anchor/vote path, the Office walkers, and Python `web/chunking/`
  (`journey:34-44`). The **defects ledger** (`journey:271-291`) is the authoritative
  per-seam table. Reproduced with status verified against the field note:

| Tag | Seam (`file::symbol`) | Complexity found | N-driver | Status (verified) |
|---|---|---|---|---|
| S1 | `PdfStructTreeReader::RebuildPathIndex` (via `CheckDisposed`) | `O(P·N_tree) ≈ O(P²)` | page count | **FIXED** Phase 2 — incremental subtree re-index (`journey:273`) |
| S2 | `PageStructureProjector::SwapRolesOnPage`(+Figures/+Headings) | `O(P·N_tree) ≈ O(P²)` | page count | **FIXED** Phase 2 — reuse one-walk bucket (`journey:274`) |
| S3 | `DocxContrastMutator` via `DocxStyleChainWalker` | `O(R·S)` | runs×styles | queued Ph5 (`journey:275`) |
| S4 | `PdfFontMetricsExtractor` (`_current.Text += text`) | `O(block²)`/block | glyphs | queued Ph2 fold-in (`journey:276`) |
| N1 | `web/chunking/merge.py::PptxMergeStrategy._patch_slides_from_chunk` | `O(N_chunks·E) ≈ O(slides²)`, **unconditional** | chunks/slides | queued Ph4 — highest blast-radius (`journey:277`) |
| N2/a/b/c | `PdfStructElemGeometry::LookupPageNumber` + `PdfActualTextRemediator::ResolvePageNumber` (dup) + 3 drivers | `O(P)`/call → `O(P²)` per driver | page count | queued Ph3; also a rule-#11 DRY dup → unify to `PdfPageIndexMap` (`journey:278`) |
| N3 | `PdfVisionReadingOrderRemediator::AccumulatePageReorder` | `O(D²)` | page-kids | queued Ph3 (`journey:279`) |
| N4 | `web/chunking/reuse_plan.py::slice_plan_for_chunk` + `_find_owning_chunk` | `O(N_chunks·members) ≈ O(slides²)`, gated | chunks/slides | queued Ph5 (`journey:280`) |

- **Verify/correct the specific characterizations you offered:**
  - *S1/S2 "O(P²) on the v2 struct path"* — **CONFIRMED** (`journey:273-274`); both are
    `O(P·N_tree) ≈ O(P²)` and both are FIXED to O(N).
  - *N1 "per-chunk full-PPTX-deck rewrite → O(slides²)"* — **CONFIRMED and it is
    unconditional** on every multi-chunk PPTX job (`journey:277`). Highest-blast-radius
    finding.
  - *N2 "page-resolution family"* — **CONFIRMED**; additionally it is a **DRY duplicate**
    (two independent linear page-number scans), and the fix unifies them into one
    `PdfPageIndexMap` (`journey:278`).
- **A residual honestly logged** (`journey:282-291`): even the S1 "incremental" path retains
  an `O(N_tree)` descendant scan (`RemoveSubtreeDescendants`), so HEAD grows *sub-linearly*
  (N=150 ≈ 1.7× N=25), not perfectly flat — noted as low-priority `[FIX]`, not a new defect.

---

## 3. Complexity pin-tests — the ratio-based scaling probe

**Status: SHIPPED** for S1/S2 (the probe is a real, CI-safe test cited by the provider).

- **The probe.** `FigureSwap_PerPageCost_StaysRoughlyFlat_AsPageCountGrows` in
  `PdfStructTreeReaderIncrementalIndexTests` — cited verbatim by the complexity provider
  as `_FIGURE_SWAP_PROBE` (`remediation_graph_complexity_provider.py:150-153`) and both
  seed annotations reference it (`:180`, `:199`).
- **N values tested.** Originally **N = 25 / 50 / 100**; hardened to top out at **N = 150**
  (`journey:63-68`, `:82-85`). Your "N = 25 / 50 / 100 / 150" recollection is **correct as
  the union across versions** — 100 was the original top point, 150 the hardened top point.
- **What is measured / the ratio.** Per-page swap **cost** (work/time) is timed at each N;
  the test asserts the **ratio of cost-per-page at the top N vs the base N stays ≈ 1.0**
  (flat), NOT an absolute runtime. A residual `O(N²)` would show ratio ≈ 4.0 at 100/25
  (`journey:64-68`).
- **Measured HEAD result.** Ratio **1.03** on the fixed code (`journey:68`,
  `remediation_graph_complexity_provider.py:147-149` records "100/25 = 1.03, flat").
- **Why a ratio, not an absolute threshold / CI-safety.** A ratio **normalizes out
  machine-speed and GC/timer noise** — the discriminating signal (does cost-per-unit *grow*
  with N?) is scale-invariant, so it is CI-safe across heterogeneous runners. This is the
  field note's stated rationale (`journey:62-68`).
- **CAVEAT.** The exact per-N observed values beyond the ratios (1.03 HEAD; the broken
  ratios below) live in the field note and phase-2/2b docs as recollection; the *committed*
  artifact is the test method + the provider's `scale_probe` citation, not a stored raw
  measurement table.

---

## 4. Negative controls and falsification — the strongest evidence in the whole story

**Status: SHIPPED** (Phase 2b ran the negative controls; the discipline is codified as a
standing recommendation).

- **Was the broken implementation deliberately restored?** **Yes.** Phase 2b "restored each
  pre-fix `O(N²)` implementation in isolation, re-ran the identical probe, and confirmed it
  FAILS" (`journey:70-85`; doc `phase-2b-probe-falsification-260818.md`).
- **Observed broken ratios (verify/correct your recollection):**
  - S2-reverted: **4.41** at N=100 (`journey:77`). *(You recalled ~"4.4" — correct.)*
  - S1-reverted (grouped fixture): **3.18–3.45** at N=100 (`journey:77-79`). *(You recalled
    ~"3.2" — correct.)*
  - The S1 margin over the **3.0× threshold** was judged **too thin** (~6–12%), so the top
    point was raised **100 → 150**, pushing broken-S1 to **4.08–4.28** (`journey:80-85`).
    *(You recalled "later broken-S1 ~4.1×" — correct.)*
  - HEAD stayed **≈1.1–1.8** (`journey:84`, `:88`). *(You recalled "1.1–1.8" — correct.)*
  - The visual: `HEAD ~1.1–1.8 < [3.0× threshold] < broken-S1 ~4.1–4.3 < broken-S2 ~6.5`
    (`journey:88`).
- **What each ratio means.** cost-per-page(top-N) ÷ cost-per-page(base-N). ≈1 = flat
  (linear); ≈4 = quadratic residual (4× the pages ⇒ 4× the per-page cost).
- **Was N raised 100→150 specifically to widen discrimination?** **Yes, exactly**
  (`journey:80-85`).
- **Is it a standing engineering rule?** **Yes — as a recommendation, not (yet) a hard
  gate.** "Every complexity fix that ships a scaling probe must ship its negative control
  before the Epic closes — the measured analogue of rule #43" (`journey:91-96`). It is
  **encoded in the model as type-level teeth**: a `REAL_HOT_FIXED` complexity annotation
  **MUST** cite a `scale_probe`, enforced by `INV-CX-PROBE` in
  `annotation_findings()` (`remediation_graph_complexity_provider.py:304-308`). So the
  authority is: soft-rule in prose **+** a hard well-formedness check in the provider
  (though the drift-lint that would run it in CI is DEFERRED — see prompt 15).

---

## 5. The GenAI nondeterminism incident — "33 vs 82 region count"

**Status: MERGED** as a *documented finding*; the general phenomenon is now **measured**
(baseline scorecard 260819), but the specific 33-vs-82 pair is **not yet reduced to a
`seam_cite` + measured-variance ledger entry**.

- **The operation.** A **structural GenAI region-segmentation call** on the intra-page
  vision path returned "a materially different region count (33 vs 82) run to run on
  identical input" (`journey:120-124`, `:304-308`). It is the founding finding that seeded
  the `structural-genai-determinism-measurement-260818` Epic.
- **What 33/82 count.** **Regions** (page-segmentation boxes) — i.e., the box-set the
  downstream tag tree is built over. The tolerance model gives it a dedicated metric:
  `StructuralDiffMetricId.REGION_SET = "region-set"` "region segmentation (the 33-vs-82
  case) → box-set IoU + count delta" (`remediation_graph_tolerance_provider.py:124-125`).
- **Were inputs identical?** Held-constant claim is **same page, same input**
  (`journey:122`); note the calibration harness holds the fixture constant across K runs
  (prompt 6).
- **Defect, stochastic, or missing-tolerance?** The field note is deliberately careful:
  it is characterized as **"evidence the system lacked a declared tolerance"** — a
  structural call *should* be near-reproducible, and the absence of a declared+measured
  variance budget is the modeling gap, not (yet) a proven code defect. **Do not call it a
  bug** in the book; call it "the finding that revealed a missing measured property."
  (`journey:120-124`, `:304-308`.)
- **Downstream consequence.** Region count drives the structural tag tree; a 33-vs-82 swing
  changes the emitted structure run-to-run — the reproducibility the determinism Epic exists
  to bound.
- **CAVEAT / open item.** The defects-ledger "Open — GenAI-determinization defects" section
  is **explicitly empty of per-seam entries as of 260818** (`journey:293-308`): "The region
  33-vs-82 nondeterminism … Not yet reduced to a `seam_cite` + measured variance entry —
  append once the Step-1 harness has run it." The Step-1 harness **has since run** (baseline
  scorecard `baseline-scorecard-260819.md`), measuring `region-set`… *but on the fixture set
  it used, the whole-tree `struct-tree` metric dominated*; the specific 33-vs-82 reproducer
  is named as **future work** ("larger/region-heavy 33-vs-82 reproducer",
  `baseline-scorecard-260819.md:66`).

---

## 6. GenAI tolerance / calibration model

**Status: SHIPPED (offline model + `--fake` harness), IN-PROGRESS (live calibration).**

- **Terminology (your explicit ask).** The project's terms: **tolerance** (the budget),
  **tolerance class** (`TIGHT`/`LOOSE`/`NA`, derived from `NodeKind`), **ε (epsilon)** (the
  bound), **structural divergence** (the measured quantity), **scorecard** (the K-run
  report), **calibration** (running the harness). NOT "variance" as the headline term.
  Receipts: `ToleranceClass` (`tolerance_provider.py:102-113`), `ToleranceBudget`
  (`:152-164`), `StructuralDiffMetricId` (`:115-130`).
- **What is measured.** **Mean-pairwise structural divergence ∈ [0,1]** over K runs, scored
  by a per-call-type metric that keys ONLY on structural fields — never free text
  (`:152-164`, `:309-322`; `StructNodeRef` carries `struct_id/role/order/group/box`, no text).
- **Over how many runs.** `K_BASELINE = 10` for TIGHT (structural), `K_PROBE = 3` for LOOSE
  (descriptive) (`:143-145`). The 260819 baseline ran K=3 on a 1-page fixture
  (`baseline-scorecard-260819.md`).
- **Which statistic is retained.** Per-node `{divergence, epsilon, ci_low, ci_high, passed}`
  rows (`baseline-scorecard-260819.md:24-25`) — a point divergence + a 95% bootstrap CI.
- **Acceptable variation / the bound.** `EPSILON_MAX_STRUCTURAL = 0.05` — a
  `GENAI_STRUCTURAL_DETERMINISTIC` node's ε **must be ≤ 0.05** ("at most 5% mean-pairwise
  structural divergence"); LOOSE ε is effectively unbounded (`_EPSILON_LOOSE = 1.0`)
  (`:132-138`). The bound is **manually chosen** (a declared ceiling), not empirically
  derived or adaptive — `tolerance_of` derives the budget from the class, not from data
  (`:222-246`).
- **The budget is DERIVED, not authored.** `derive_tolerance_class` is total +
  type-exclusive over `NodeKind` (`:208-219`): structural → TIGHT (ε≤0.05), descriptive →
  LOOSE, algorithmic → NA (`None`). A structural node **cannot self-declare LOOSE** to dodge
  the scorecard — the determinism sibling of `INV-GRAPH-CONFIG-EXCLUSIVE`.
- **What happens when behavior exceeds ε.** Today: **observational** — the scorecard
  reports PASS/FAIL per node; it is landed **AUDIT-ONLY-first** (rule #55). It is **not yet
  a gate** on the runtime path (the model is INV-GRAPH-DECL-INERT). The consequence is a
  measurement deliverable + the "wire the seed and re-measure" backlog, not a blocked
  remediation.
- **Where represented / where results live.** Model + harness:
  `remediation_graph_tolerance_provider.py`. Diff identity is **REUSED**, not forked: it
  keys on the editor-IR `structId` path-form (`web/static/editor/cards.ts::structId`,
  `INV-TOL-DIFF-REUSE`, `:24-33`, `:306`). Results: `baseline-scorecard-260819.md` +
  `baseline-scorecard-260819.001414.jsonl`.
- **Live vs fake.** `FakeStructuralRunSource` runs offline in CI; `CliStructuralRunSource`
  (the live path invoking each node's rule-#52 typed CLI invoker) **fail-louds until
  POST-FREEZE** (`:48-53`, `:50-51`). So the *model + offline scorecard* ship; *live K-run
  calibration against real GenAI* is IN-PROGRESS/post-freeze.

**The measured baseline (the punchline).** `baseline-scorecard-260819.md:27-35`:

| metric | nodes | measured divergence | ε | 95% CI | verdict |
|---|---|---|---|---|---|
| `struct-tree` | 19 | **0.476** | 0.05 | [0.238, 0.714] | **FAIL** |
| `group-partition` (`pdf-intra-page-vision-fuse`) | 1 | **0.133** | 0.05 | — | **FAIL** |

**measured = 20, skipped = 0, PASS = 0, FAIL = 20** — every structural node is over budget at
temp-0 *without a seed*. The scorecard's own diagnosis: the 0.476 is "residual temp-0
nondeterminism without a seed" (`:47`), and the top recommendation is "wire the **seed**
(input technique #1) and re-measure — it may collapse a large share of the 0.476 at once"
(`:74-75`). This is the single most important as-built fact for Part III (see prompt 14).

---

## 7. Computation/task-graph ontology — nodes and edges as they actually exist

**Status: SHIPPED** (model landed, 0 findings live, pin-tested).

**Nodes** (`RemediationNode`, `remediation_graph.py:261-288`):
- **Schema:** frozen dataclass with `id: NodeId` (a stable pass slug), `kind: NodeKind`,
  `phase_ref: str` (a `PhaseId` value), `genai_tasks: tuple[str,...]` (`GenAiTask` keys),
  `seam_cite: str` (`file::symbol`), `format: NodeFormat`. **Identity + coloring + POINTERS
  ONLY — no attribute fields** (`:261-267` docstring: "Carries identity + coloring +
  POINTERS ONLY. Every governance attribute lives in a sibling provider keyed by `id`").
- **Identity mechanism.** `NodeId` is a **stable pass slug derived from the C# class name**
  (`slug_for_pass`, `:325-332`): `PdfStructAltTextGenAiPass → pdf-struct-alt-text-gen-ai`.
  The same slug function is applied to BOTH the declared ids and the live registry read, so
  they stay equal **by construction** (`:325-332`, `:344-366`).
- **NodeKind values (verify your claim).** A closed 3-value enum (`:158-170`):
  `genai-structural-deterministic`, `genai-descriptive-creative`, `algorithmic`. Your
  "distinguishes deterministic and GenAI at minimum" is **understated** — it is a **3-way**
  color: it splits GenAI into *structural* (held to a tolerance, gets a temp-0+seed config)
  vs *descriptive/creative* (alt-text/prose, loose), and keeps *algorithmic* separate. That
  3-way split is the whole engine that routes config + tolerance downstream.
- **"A node is a computation/task regardless of realization" — CONFIRMED.** A node is a
  **remediation pass** (pipeline stage), GenAI or algorithmic alike; 62 of 113 are
  `algorithmic` (live count). The abstraction deliberately absorbs the PDF-vs-Office
  type-asymmetry: PDF passes are C# class instantiations; Office passes are `<Fmt>PassId`
  enum members (`:34-60`, `:173-196`).
- **Populated at full parity.** 113 nodes (live count) with **0 PDF parity drift, 0 O365
  parity drift, 0 well-formedness findings** (executed live). The node set is **projected
  from** the live C# `PdfPassRegistry` (`read_live_pass_slugs`, `:873-884`) + the three
  `<Fmt>PassId` enums (`read_live_office_pass_slugs`, `:915-943`) at check time — rule #42,
  never a hardcoded snapshot.

**Edges** (`Edge`, `remediation_graph.py:291-309`):
- **Schema:** `producer: NodeId`, `consumer: NodeId`, `contract_ref: str | None`,
  `kind: EdgeKind`.
- **Semantics / direction / data-flow.** Directed producer→consumer; represents **data
  flow** carrying a **typed contract**. `EdgeKind` (`:217-229`): `data-flow` (intra-machine
  typed hand-off), `mutation` (in-process state write referencing the mutator registry),
  `cross-service` (a real SOA/process boundary where JSON is materialized).
- **"An edge represents data flow and its contract, NOT deterministic computation" —
  CONFIRMED.** This is the explicit design correction (prompt 8); an edge carries **no
  governance semantics of its own** (`:62-72`, `journey:150-157`).
- **Control flow.** **Not modeled** — phase ordering is a separate model
  (`remediation_pipeline_phases.PhaseId`, pointed at by `phase_ref`), so the graph does not
  re-encode control flow; edges are data-flow only.
- **CAVEAT — the edge set is a stub.** There are **exactly 2 edges** (live count;
  `:708-721`), both among PDF seed nodes. The nodes are fully populated; the **edge graph is
  a seed**, not a complete DAG. This is the honestly-weak facet (prompt 9 / the "EDGE
  RATCHET", prompt 14).

---

## 8. Design-history corrections — the node-vs-edge conversation

**Status: SHIPPED** (the correction is baked into the landed shape and chronicled).

1. **Was the early design "GenAI = nodes; deterministic = edges"?** **Yes.**
   "The initial framing (WRONG): nodes = GenAI tasks; edges = deterministic tasks"
   (`journey:141-146`).
2. **Why rejected?** It "inverts the actual shape of the pipeline (most passes ARE
   algorithmic; GenAI passes are the minority that need the tightest governance)"
   (`journey:143-146`). Relegating every algorithmic pass to a mere connector between GenAI
   nodes mis-models the DAG.
3. **Was the key correction "most pipeline passes are themselves algorithmic computations
   and therefore belong as nodes"?** **Yes exactly** — "nodes = ALL tasks (GenAI and
   algorithmic alike), colored by a typed kind; edges = data-flow + I/O format only"
   (`journey:148-157`). The live count bears it out: 62/113 nodes are algorithmic.
4. **Alternatives considered for node attributes.** The design considered accumulating
   complexity/tolerance/cost/latency as **first-class node fields** and **rejected** it in
   favor of identity + provider side-table (`journey:158-161`, `:204-211`).
5. **Why identity+pointers+providers over fields-on-node.** So that "adding the 5th
   attribute is a new provider file with **zero churn** to the graph model or to any other
   attribute's consumers — the schema-stability goal (rule #45) made true by construction
   rather than by discipline" (`journey:204-211`). This is the book's "stable identity
   permits orthogonal models" lesson, grounded.
   - A secondary insight worth quoting: **typing the edges sharpened the nodes** — "a node's
     output type is exactly the contract of its outgoing edges, so naming edges precisely
     forces every node's output to be named precisely too" (`journey:170-186`).

---

## 9. Typed edge contracts and `contract_ref=None`

**Status: SHIPPED** (the mechanism), **IN-PROGRESS** (the ratchet's runtime teeth).

- **In-memory vs serialized (verify your claims).** **CONFIRMED and sharpened:** an edge's
  `contract_ref` names a **typed wire-contract identifier whose generated C#/Py/TS types
  ARE the in-memory contract**; the `<stem>.schema.json` is that contract's **OPTIONAL
  serialization projection**, materialized only at `CROSS_SERVICE` boundaries + STAGING
  serialize-and-check (`:62-72`, `:291-309`). So it is **not** "in-memory → class symbol"
  vs "serialized → wire contract" as two different things; it is **one typed contract** with
  an optional JSON projection. Intra-machine `DATA_FLOW` edges carry the typed symbol and
  **need not serialize** (the "R1 fold", `:62-72`).
- **Existing wire-contract representations reused, not duplicated — CONFIRMED.** Contracts
  resolve against `system-models/wire-contracts/<stem>.schema.json`
  (`_wire_contract_exists`, `:1060-1062`); the codegen mechanism (`gen-wire-contracts.py`)
  is reused, not re-invented (`:62-72`).
- **A node's output type via its outgoing edge — CONFIRMED as design intent**
  (`journey:170-174`), though only 2 edges exist so it is exercised at seed scale.
- **What `contract_ref=None` means (your most important ask).** It is a **published
  as-built gap** — "a producer→consumer boundary with no wire contract yet (A.18), not a
  hand-rolled inline shape" (`:70-72`, `:299`). From your menu, the precise reading:
  - It is **"contract not yet modeled / technical-debt backlog"** for that boundary, AND
  - it is **NOT a defect for an in-memory edge** — "an in-memory `DATA_FLOW` edge
    legitimately needs no wire-contract schema at all, so `contract_ref=None` is not itself
    a defect; it becomes one only once the edge is serialized without a contract"
    (`journey:180-186`).
  - So: **do not** read `None` as "genuinely untyped data" or "not applicable" in general.
    Read it as **"no serialized wire contract has been authored for this boundary yet;
    honest absence, not invented precision."** The live seed has exactly one such edge
    (`PdfIntraPageVisionFuse → PdfStructAltTextGenAi`, `:709-714`) and one resolving one
    (`marker-pass-fidelity`, `CROSS_SERVICE`, `:715-720`).
- **The teeth.** `INV-GRAPH-EDGE-CONTRACT-RESOLVES`: a **non-None** `contract_ref` must
  resolve to a schema on disk (`_edge_contract_findings`, `:1065-1077`) — a renamed/deleted
  schema is a finding; `None` is sanctioned. The complement — "every serialized edge MUST
  be typed" — is the **AUDIT-ONLY** `lint-serialized-edge-has-contract.py` ratchet
  (`:42-44`), not yet blocking.

---

## 10. Attribute-provider architecture

**Status: SHIPPED** (registry + 4 providers landed & tested).

- **The design (verify).** `NodeId → independently-maintained attribute providers`
  — **CONFIRMED.** `AttributeProviderRegistry` (`:790-816`) is a side-table keyed by
  `AttributeName`; each provider implements the `AttributeProvider` Protocol (`:769-787`):
  `name`, `value_for(node_id) -> object|None`, `covered_nodes() -> frozenset[NodeId]`.
- **Which providers EXIST vs planned.** **Four exist as landed, committed, tested files**
  (all on main; verified `git log`):
  - `KIND_CONFIG` → `remediation_graph_config_provider.py` (SHIPPED) — routes each node to
    `DeterministicConfigIntent` (temp 0 + **required seed**) vs `CreativeConfigIntent` (no
    seed), the two being **non-unifiable Python types** so a structural node can never take a
    creative config (`config_provider.py:74-134`, `:154-170`).
  - `COMPLEXITY` → `remediation_graph_complexity_provider.py` (SHIPPED) — Big-O +
    `NDriver` + `scale_probe`; **sparse** coverage (only hot-seam nodes), seeded from the
    S1/S2 fixes (`complexity_provider.py:101-133`, `:156-206`).
  - `COST` → `remediation_graph_cost_provider.py` (SHIPPED) — composes
    `remediation_cost_budget` (the `$` spine) + `batch_execution_model` (latency); two
    **dimensionally-separate** facets never summed (`cost_provider.py:124-155`, `:300-360`).
    **Total** coverage over the node set (`:219-225`).
  - `DETERMINISM_TOLERANCE` → `remediation_graph_tolerance_provider.py` (SHIPPED) — the
    K-run scorecard + `structId`-reuse metric (prompt 6).
  - **Planned-only:** `MODEL_SELECTION` (Phase 9, DESIGNED — see prompt 15).
- **Storage / layout.** One provider **file per attribute** in `system-models/`; each
  self-registers via an **explicit idempotent `register()`**, *never* an import side effect
  (to protect the ships-empty pin — `config_provider.py:209-224`, and identically in the
  other three). The default `PROVIDERS` registry **ships EMPTY** (`:819-822`; verified live
  `PROVIDERS.registered() == frozenset()`).
- **Join mechanism / validation / missing-attr behavior.** Join key = `NodeId`.
  Validation = `attribute_findings()` rejects **ghost coverage** (a provider covering a
  node the graph lacks, `:1094-1113`) + `register()` rejects a **duplicate axis**
  (`:799-807`). Missing attribute = `None` (`_attr_value`, `:830-836`) — the read contracts
  return `None` when no provider is registered.
- **"A 5th concern is a new provider with little/no churn" — CONFIRMED, with one nuance.**
  Adding an attribute is: 1 new provider file + **1 new `AttributeName` enum member**
  (`:232-242`). The enum-member edit is a **one-line touch to the substrate**, not "zero
  churn to the graph" literally — but it is **zero churn to every *other* provider and to
  the node/edge records**. Phase 9's own status ("MODEL_SELECTION … already declared in the
  founding Types block") is **stale/wrong** — that member is **not** in the code
  (`:232-242` shows only 4 members; verified live). So the *design predicts* zero-churn; the
  *reality* is "+1 enum member," and Phase 9 overstates by asserting the member already
  exists.

---

## 11. Relationship to existing DocAble models

**Status: SHIPPED** (the joins are real and pointer-based).

- **Reuses existing identities — YES.** The graph **projects/points at** existing keyspaces
  rather than minting a parallel namespace:
  - `phase_ref` → `remediation_pipeline_phases.PhaseId` values (cross-model join,
    `:990-993`).
  - `genai_tasks` → live `GenAiTask` enum keys (`read_live_genai_tasks`, `:971-982`).
  - `seam_cite` → `file::symbol` code anchors into `backend/src/...`.
  - node set → live `PdfPassRegistry` + `<Fmt>PassId` enums (`:126-148`).
  - cost provider → `remediation_cost_budget`, `batch_execution_model`,
    `warm_path_segments`/`warm_path_measurements.json` (`cost_provider.py:70-73`).
  - tolerance provider → editor-IR `structId` identity (`tolerance_provider.py:306`).
- **New namespace introduced?** Only the `NodeId` **slug** vocabulary — but it is
  *derived from* the C# class names, so it is a **stable renaming of existing identities**,
  not a new independent registry.
- **Concrete joins.** A node's `NodeId` joins to: its complexity annotations (via
  `node_ref`), its cost annotation (via `node_ref`), its tolerance budget (via `NodeKind`),
  its phase (via `phase_ref`), its GenAI tasks (via `genai_tasks`), its code seam (via
  `seam_cite`), and — designed — its model choice (Phase 9). Whether the same id also joins
  to **provenance/stamp** records is **not yet wired** (no provenance provider exists); it
  is a natural future provider but **PROPOSED**, not built.

---

## 12. What the graph makes newly cheap (queries) vs. aspirational

**Status: mixed — some queries are SHIPPED-answerable today; several are aspirational.**

**Answerable TODAY from committed artifacts (SHIPPED):**
- *"Which nodes are GenAI vs algorithmic, by color?"* — `nodes_by_kind()` / `genai_nodes()`
  (`:1178-1190`); live: 37 structural, 14 descriptive, 62 algorithmic.
- *"Which tasks have known super-linear behavior (and is it fixed)?"* — the complexity
  provider's annotations + `SeamStatus` (`complexity_provider.py:88-98`); today: S1/S2
  FIXED, S3/S4/N1–N4 queued (prompt 2 table).
- *"Which structural GenAI nodes lack a passing tolerance?"* — the scorecard: **all 20
  measured structural nodes FAIL at temp-0** (`baseline-scorecard-260819.md:34`).
- *"Which serialized edges lack a modeled contract?"* — `edge_contract_drift()` (`:1080-1086`)
  + the AUDIT-ONLY serialized-edge lint; live: 0 drift, 1 sanctioned `None` gap.
- *"What is the estimated $ / modeled latency of a node?"* — `cost_of()`
  (`cost_provider.py:253-264`).
- *"Which test establishes a node's complexity property?"* — the `scale_probe` field
  (`complexity_provider.py:133`), e.g. S1/S2 → `FigureSwap_PerPageCost_...`.
- *"Is any runtime module reading this model (should be none)?"* — `runtime_path_references()`
  (`:1151-1172`), the INV-GRAPH-DECL-INERT probe.

**Aspirational / limited today (be honest in the book):**
- *"Which tasks lie on a particular artifact path?"* / *"Which expensive nodes affect a
  particular output?"* / *"Where can nondeterminism enter the pipeline?"* — these need the
  **edge graph**, which is a **2-edge seed** (`:708-721`). Reachability/path queries are
  **aspirational** until the DAG is populated. This is the honestly-weak "EDGE RATCHET"
  facet (`journey:222-237`).
- *"Which GenAI tasks lack calibrated tolerance?"* — partially answerable, but live
  calibration is post-freeze (`CliStructuralRunSource` fail-louds); the 260819 baseline is
  1 fixture, K=3.

**The load-bearing point for the book:** the graph makes the **node-keyed attribute joins**
newly cheap (one `NodeId` instead of three parallel keyspaces); it does **not yet** make
**path/reachability** queries cheap, because the edges are a seed.

---

## 13. Degrees of implementation freedom

**Status: SHIPPED as a design property; supported by concrete examples.**

The interpretation is **supported**: the model constrains *consequential properties*
(kind→config, complexity envelope, tolerance ε, cost facets) without prescribing
implementations.
- **Deterministic freedom example.** S2's fix changed `SwapRolesOnPage` from a whole-tree
  re-`Walk()` to consuming a pre-built bucket — a **complete implementation change** that
  preserved the functional contract *and* satisfied the same complexity obligation
  (`journey:53-60`, `complexity_provider.py:182-200`). The annotation's `declared`
  (`O(N)`) is the obligation; the algorithm underneath is free.
- **GenAI freedom example.** A `GENAI_STRUCTURAL_DETERMINISTIC` node must resolve to a
  `DeterministicConfigIntent` (temp 0 + required seed) and a TIGHT (ε≤0.05) tolerance — but
  *which* model/prompt/decode-strategy realizes that is free, so long as it stays in the
  envelope (`config_provider.py:154-170`, `tolerance_provider.py:222-246`). The seed source
  is explicitly a "runtime concern" the model does not fix (`config_provider.py:83-85`).
- **CAVEAT.** This is a **modeling-level** freedom (the inert model declares obligations);
  since the model is INV-GRAPH-DECL-INERT it does not *enforce* the envelope at runtime, so
  "constrains" here means "declares + measures against," not "blocks." Say so in the book.

---

## 14. Modeling-to-alignment chain

**Status: deterministic chain COMPLETE; GenAI chain's final consequence NOT YET
implemented (state it explicitly, per your ask).**

**Deterministic / complexity (the strong, complete chain):**
`incident (322 s stall, PdfPageContentScanner O(R²), journey:20-28)` → `recurring question
("is this defect class elsewhere?" → the audit directive, journey:30-33)` → `represented
entity (RemediationNode pdf-page-structure-v2-read-model; ComplexityAnnotation S1/S2,
complexity_provider.py:145-206)` → `explicit property (declared=O(N), n_driver=PAGE_COUNT)`
→ `measurement (FigureSwap ratio probe, ratio 1.03 HEAD)` → **negative control**
`(broken-S1 4.08–4.28, broken-S2 4.41 vs threshold 3.0, journey:70-88)` → `consequence
(INV-CX-PROBE requires the probe before a FIXED claim is well-formed,
complexity_provider.py:304-308)`.

**GenAI / determinism (the chain whose consequence is pending):**
`incident (region 33-vs-82, journey:120-124)` → `recurring question (missing declared
tolerance)` → `represented entity (GENAI_STRUCTURAL_DETERMINISTIC nodes; ToleranceBudget)`
→ `explicit property (ε ≤ 0.05, TIGHT, tolerance_provider.py:132-135)` → `evaluator (K-run
structural-diff scorecard, structId-reuse metric)` → `measurement (260819 baseline: 0.476
struct-tree, 20/20 FAIL)` → **consequence: NOT YET A GATE.** The scorecard is AUDIT-ONLY;
the seed that would collapse the divergence is unwired (prompt 15); the live calibration is
post-freeze. **The book's Part III must state that the GenAI consequence/gate is not yet
implemented** — the evidence exists (the FAIL scorecard) but the "consequence" rung is
open. This is, precisely, the book's own distinction: *the model states the property; the
property admits evidence; alignment (not yet built here) would give the evidence
consequence.*

---

## 15. Current implementation status

**The four-way status split (your explicit ask):**

- **SHIPPED (on main, tested):** the substrate `remediation_graph.py` (113 nodes, 0 findings
  live); the 4 attribute providers (config/complexity/cost/tolerance); the PDF node-parity
  gate (BLOCKING); the offline `--fake` K-run scorecard; the S1/S2 complexity fixes + their
  ratio probe + negative controls; the `DeterministicSeed` helper + `OpenAiClient` seed
  plumbing.
- **MERGED (on main, lighter coverage):** the O365 node population (57 nodes) — its parity
  gate is **AUDIT-ONLY-first** (`lint-remediation-graph-parity.py:28`); the 260819
  determinism baseline scorecard (1 fixture, K=3).
- **IN-PROGRESS (foundation landed, wiring pending):** the **determinism seed** — the helper
  (`DeterministicSeed.cs`), the `seed` param through `OpenAiClient` (`OpenAiClient.cs:262,
  306, 673`, emits `"seed": N` to the OpenAI Responses API), but **no structural pass call
  site derives/passes a seed** (verified: `grep DeterministicSeed backend/src/` returns
  only the definition file; no `seed:` at any `Pdfs/` call site). The meta-gate
  `lint-remediation-graph-resolves.py` and the serialized-edge ratchet are **AUDIT-ONLY**
  (`resolves.py:55-57`, `serialized-edge:42-44`). The complexity drift-lint is **DEFERRED**
  (`complexity_provider.py:41-45`).
- **DESIGNED (design doc only, no impl):** the **MODEL_SELECTION** provider (Phase 9) —
  `phase-9-model-selection-attribute-design-260818.md` header: "**DESIGN DOC ONLY — impl
  HELD by the deploy freeze. No C# / no provider build this phase.**" No provider file
  exists; the `AttributeName.MODEL_SELECTION` member is **not declared** in code. The
  live-K-run `CliStructuralRunSource` path (post-freeze). The N1/N2/N3/N4/S3/S4 complexity
  fixes (identified, queued).
- **PROPOSED (floated, no design):** a provenance/stamp attribute provider joining `NodeId`
  to attribution records; path/reachability queries over a populated edge DAG.

### Consolidated fact table (publication-grade)

| # | Claim | Status | Evidence (`file:line` / symbol) | Caveat |
|---|---|---|---|---|
| 1 | Substrate names the pipeline as a task graph; 113 nodes, 0 well-formedness findings | SHIPPED | `remediation_graph.py` (executed live: 113 nodes, 0 findings) | Edge set is a 2-edge seed, not a full DAG |
| 2 | Nodes carry identity + kind + pointers only; **no attribute fields** | SHIPPED | `RemediationNode` `remediation_graph.py:261-288` | — |
| 3 | Attributes attach via a **side-table registry keyed by NodeId**, not node fields | SHIPPED | `AttributeProviderRegistry` `:790-816`; ships empty (live) | Adding an attribute = +1 provider file **and** +1 enum member |
| 4 | `NodeKind` is a 3-way color (struct-det / descr-creative / algorithmic) | SHIPPED | `:158-170`; live kinds 37/14/62 | Book's "det vs GenAI" is understated |
| 5 | Node set is **projected live** from C# `PdfPassRegistry` + `<Fmt>PassId` enums (rule #42) | SHIPPED | `read_live_pass_slugs` `:873-884`; `read_live_office_pass_slugs` `:915-943`; 0 drift live | 2 fully-qualified PDF passes carry no node by design (`:57-60`) |
| 6 | Edges are **typed contract symbols; JSON is an optional projection** | SHIPPED | `Edge` `:291-309`; `EdgeKind` `:217-229` | Only 2 edges exist |
| 7 | `contract_ref=None` = published as-built gap (no wire contract yet), not "untyped" | SHIPPED | `:299`, `:70-72`; `journey:180-186` | Only a *defect* once a serialized edge lacks a contract |
| 8 | Model is **INV-GRAPH-DECL-INERT** — never on the runtime path | SHIPPED | `runtime_path_references` `:1151-1172`; `:74-80` | — |
| 9 | Four attribute providers landed (config/complexity/cost/tolerance) | SHIPPED | 4 `*_provider.py` files; all on main (`git log`) | Coverage varies (complexity sparse; cost total) |
| 10 | Config: structural→temp0+**required seed**; descriptive→no seed; non-unifiable types | SHIPPED | `config_provider.py:74-134`, `:154-170` | Intent projection; not the runtime config object |
| 11 | Complexity: S1/S2 O(P²)→O(N) fixed; ratio probe 1.03 HEAD | SHIPPED | `complexity_provider.py:145-206`; `journey:53-68` | 322 s figure is recollection, not a stored benchmark |
| 12 | Negative control: broken-S1 4.08–4.28, broken-S2 4.41 vs 3.0 threshold; N raised 100→150 | SHIPPED | `journey:70-88`; `phase-2b-probe-falsification-260818.md` | Exact per-N tables live in docs, not a committed dataset |
| 13 | `INV-CX-PROBE`: a FIXED complexity claim MUST cite a `scale_probe` | SHIPPED | `complexity_provider.py:304-308` | Drift-lint that runs it in CI is DEFERRED |
| 14 | Tolerance: ε≤0.05 for structural, derived from NodeKind, `structId`-reuse metric | SHIPPED | `tolerance_provider.py:132-135, 208-246, 306` | Bound is manually chosen, not derived/adaptive |
| 15 | Determinism baseline: **20/20 structural nodes FAIL at temp-0**; struct-tree 0.476 | MERGED | `baseline-scorecard-260819.md:27-35` | 1 fixture, K=3; region 33-vs-82 reproducer is future work |
| 16 | Region 33-vs-82 is the founding determinism finding; has a `region-set` metric | MERGED | `tolerance_provider.py:124-125`; `journey:120-124` | Not yet a per-seam measured ledger entry |
| 17 | Cost: two dimensionally-separate facets ($ + latency), never summed; composes existing spine | SHIPPED | `cost_provider.py:124-155, 300-360` | Per-segment measured latency not populated (`:213`) |
| 18 | Determinism **seed**: helper + client plumbing landed; **no structural call site passes it** | IN-PROGRESS | `DeterministicSeed.cs`; `OpenAiClient.cs:262,306,673`; grep: 0 call sites in `backend/src/AdaTool.Cli` | The scorecard's #1 recommendation is to wire it (`baseline-scorecard-260819.md:74-75`) |
| 19 | PDF node-parity gate BLOCKING; O365 parity + meta-gate + edge-ratchet AUDIT-ONLY | SHIPPED / MERGED | `lint-remediation-graph-parity.py:28,41`; `resolves.py:55-57`; `serialized-edge:42-44` | Rule #55 AUDIT-ONLY-first landing |
| 20 | MODEL_SELECTION provider is **design-only**; enum member not in code | DESIGNED | `phase-9-...:Status`; `AttributeName` `:232-242` (4 members, live) | Phase-9 doc wrongly claims the member "already declared" |
| 21 | `determinization-techniques.md` (5-stage portfolio) exists | SHIPPED | `docs/genai/determinization-techniques.md:25` (5 stages) | Field note `journey:317-325` says it doesn't exist — now **stale** |

---

## Premises in `new-model.md` that are wrong or overstated

Surfaced, not smoothed:

1. **"Attribute providers are attributes on the node."** The book's prose ("Every node has:
   NodeId, NodeKind, pointers" then "complexity/tolerance/cost model" hanging off it) is
   fine *if* it stresses the **side-table**. The figure in §5 is correct; the risk is
   readers inferring node *fields*. **They are a registry keyed by NodeId**
   (`remediation_graph.py:790-816`); providers live in **separate files** and the default
   registry **ships empty**. Keep the "orthogonal, joined by identity" framing; drop any
   implication of node-resident attributes.

2. **"The graph is executable / wires the pipeline."** Nothing in `new-model.md` says this
   outright, but Part III's "consequence / gate" grammar could imply the model *enforces*.
   It does **not** — it is **INV-GRAPH-DECL-INERT**, lint-time-only Python that the C#
   runtime *cannot import* and `web/` is kept from importing (`:74-80`, `:1151-1172`). It
   **declares and measures**; it does not gate the runtime. Part III should say the
   *alignment machinery* (probes, scorecard, lints) gives the properties consequence — the
   model itself is inert.

3. **"NodeKind at minimum distinguishes deterministic and GenAI."** **Understated.** It is a
   **3-way** color that splits GenAI into *structural* (tolerance-governed, temp0+seed) vs
   *descriptive/creative* (loose) — and that split is the entire routing engine for config
   and tolerance (`:158-170`; `config_provider.py`; `tolerance_provider.py`). Present it as
   three colors, not two.

4. **"Edges carry the contract (implying JSON per edge)."** Edges carry a **typed contract
   symbol**; JSON is an **optional serialization projection** materialized only at
   cross-service boundaries / staging checks (`:62-72`, `:291-309`). Most edges never
   serialize. Saying "edge → serialization/wire contract" as the in-memory case is wrong;
   the in-memory case IS the typed symbol, full stop.

5. **The edge set is a complete DAG.** It is **2 edges** (`:708-721`). The **nodes** are
   fully populated (113); the **edges are a seed**. Any §2.6/Part III claim about
   path/reachability ("which tasks lie on a path", "which expensive nodes affect an output")
   is **aspirational** today — the honestly-weak "EDGE RATCHET" facet
   (`journey:222-237`). Do not imply the graph can answer reachability queries yet.

6. **"Complexity and GenAI-tolerance are analogous measured properties" — true, but do not
   over-symmetrize.** The book already warns against forcing symmetry (§6), and the code
   agrees: complexity is a **declared Big-O validated by a ratio probe + negative control**
   (a falsifiable structural test), whereas tolerance is a **statistical divergence vs a
   manually-chosen ε over K stochastic runs**. Different epistemics. The field note makes
   this explicit; keep the asymmetry.

7. **The determinism story has a "gate."** It does not yet. The 260819 baseline is a **FAIL
   scorecard with no enforcement** — AUDIT-ONLY, seed unwired, live calibration post-freeze.
   The book's Part III "consequence" rung for the GenAI case must be labeled **not yet
   implemented** (prompt 14).

8. **`contract_ref=None` as strong semantics.** Your §4 already flags "unresolved serialized
   contract → explicit absence rather than invented precision" — that is **exactly right**,
   and the code confirms it (`:299`). The only correction: `None` is **not a defect for an
   in-memory edge**; it is only a gap for a *serialized* one. Don't let the book turn "no
   metadata" into "genuinely untyped data."

9. **Stale field-note artifacts to not re-inherit.** The journey note (`journey:317-325`)
   records that `docs/genai/determinization-techniques.md` "does not exist in the repo at
   260818." It **now exists** (15 KB, 5-stage portfolio, `docs/genai/determinization-techniques.md:25`).
   If the book cites the field note's PROCESS finding, flag it as resolved. Likewise the
   Epic `main.md` **Status** line still reads "🟡 Phase-1 design landed; awaiting Phase-1b"
   — **stale**: Phases 1b–9 designs and the four providers have all landed (verified on
   main). Trust the code and the phase files, not the `main.md` header.

---

## The two receipts that turn this into a MAGE example (your closing note)

1. **The negative control** (`journey:70-88`; `phase-2b-probe-falsification-260818.md`):
   broken-S1 4.08–4.28 and broken-S2 4.41 fail the very probe HEAD (1.1–1.8) passes, with N
   deliberately raised 100→150 to widen the margin. This is the falsifiability the book's
   §6 "preserve the negative control" demands — grounded and retained.

2. **The convergence on `NodeId`** (`journey:99-131`, `:250-258`): two independently-launched
   Epics — complexity (per-seam Big-O) and determinism (per-call tolerance) — were each
   "half-inventing the same graph," and the resolution was a **shared substrate giving them
   one join key (`NodeId`) instead of three.** The four landed providers, all keying on
   `NodeId`, are that convergence made real (`config/complexity/cost/tolerance_provider.py`).

*Bottom line for the author: §2.6 can be written without hand-waving on the nodes, the
attribute side-table, the complexity negative control, and the convergence — all SHIPPED.
Part III must be honest that the GenAI determinism **consequence/gate is not yet built**
(AUDIT-ONLY scorecard, unwired seed, 20/20 FAIL baseline) and that the **edge DAG is a
seed**, so reachability claims are aspirational.*
