# Field note — The remediation-graph substrate: from a CPU-tail stall to a shared task-graph model

**Status: LIVING** — this is an append-as-found chronicle, not a closed post-mortem.
Section 5 (the defects ledger) is explicitly open and is appended through the
structural-GenAI determinism-calibration wave
([`structural-genai-determinism-measurement-260818`](../epics/near-term/structural-genai-determinism-measurement-260818/main.md)).
Do not treat this doc as finished until the
[`remediation-graph-substrate-260818`](../epics/near-term/remediation-graph-substrate-260818/main.md)
Epic's `FIELD-NOTE-FINISHED` DoD task is checked off.

**Related:** [`remediation-graph-substrate-260818/main.md`](../epics/near-term/remediation-graph-substrate-260818/main.md)
(the Epic this note chronicles), [`remediation-graph-complexity-model/main.md`](../epics/near-term/remediation-graph-complexity-model/main.md)
(the complexity half of the convergence), [`structural-genai-determinism-measurement-260818/main.md`](../epics/near-term/structural-genai-determinism-measurement-260818/main.md)
(the determinism half — the open ledger section's future entries land here).

---

## 1. ORIGIN — a CPU-tail stall becomes an algorithmic-complexity audit

The chronicle does not start with a model. It starts with a **~322s pure-CPU
single-page stall**, root-caused to an `O(R²)` rescan-per-mutation in
`PdfPageContentScanner` — every content-stream edit re-scanned the whole
token stream instead of patching it in place. The fix
(`PdfContentEditBuffer` / `StreamPieceBuffer` — batch the edits into a piece
buffer, materialize once) became the reference exemplar for everything that
followed: *a per-item full-collection rebuild/re-walk inside a loop whose
iteration count scales with document size* is a recurring defect class, not
a one-off.

That framing turned an incident into a directive: **"repair the probably-non-
optimal algorithms."** A walker-complexity audit
(`scratchpad/walker-complexity-audit-260817.md`) swept the same v2
PDF-structure path and found more of the same shape — `RebuildPathIndex` /
`SwapRolesOnPage` at `O(P²)` in page count, `DocxContrastMutator` at
`O(R·S)`, `PdfFontMetricsExtractor` at `O(block²)`. The
[`remediation-graph-complexity-model`](../epics/near-term/remediation-graph-complexity-model/main.md)
Epic then **broadened** that audit across the vision-primary
projector/anchor/vote path, the Office walkers, and Python
`web/chunking/` — finding two more dominant sub-classes: **N1**, a
per-chunk full-PPTX-deck rewrite (`web/chunking/merge.py::PptxMergeStrategy._patch_slides_from_chunk`,
`O(N_chunks·E) ≈ O(slides²)`, unconditional on every multi-chunk PPTX job),
and the **N2 family** (`LookupPageNumber`/`ResolvePageNumber`/`ResolvePrimaryPage`/
`AccumulatePageReorder`), a linear page-number-resolution helper called from
whole-tree walks on three live PDF passes, compounding to `O(P²)`.

### The S1/S2 fixes and the ratio-based scaling probe

Phase 2 of the complexity Epic shipped the two highest-priority v2-struct-path
fixes, both reducing `O(P²) → O(P)`:

- **S2** — `PageStructureProjector.SwapRolesOnPage` re-`Walk()`-ed the WHOLE
  struct tree per page to select that page's role-matching nodes. The fix
  reused a bucket (`pageStructElemsByPage`) the v2 driver already builds in
  one walk, turning the projector's per-page contribution from
  `O(P·N_tree)` into `O(N_tree)`.
- **S1** — `PdfStructTreeReader` did a full whole-tree `RebuildPathIndex()`
  on the first read after **every** scoped mutator commit. The fix scopes
  the re-index to only the dirty parent's subtree
  (`TryRebuildDirtySubtree`), falling back to a full rebuild when more than
  one distinct parent is dirty or the dirty parent doesn't resolve.

Both fixes shipped with a **ratio-based scaling probe** rather than an
absolute-timing assertion — `FigureSwap_PerPageCost_StaysRoughlyFlat_AsPageCountGrows`,
which times the per-page swap cost at **N = 25 / 50 / 100 pages** and asserts
the *ratio* of cost-per-page at the top N versus the base N stays flat
(≈1.0), not that it merely completes fast. A residual `O(N²)` would show a
ratio near 4.0 at N=100/25. The measured ratio on the fixed code was **1.03**
— flat.

### The pre/post negative-control falsification

A probe that only ever runs on fixed code proves nothing (A.3
falsifiability) — a passing measurement is consistent both with "the fix
works" and with "the probe cannot see the defect it claims to guard." Phase
2b ran the missing half: it **restored each pre-fix `O(N²)` implementation
in isolation**, re-ran the identical probe, and confirmed it **FAILS** —
S2-reverted measured a ratio of **4.41** at N=100; S1-reverted (on the
grouped fixture where S1 actually helps) measured **3.18–3.45**. Both
comfortably exceeded a 3.0× assertion threshold, but the S1 margin (only
~6-12% above threshold) was judged too thin — a future regression could
slip through under GC/timer noise. The probe was **hardened**: the top
measurement point was raised from N=100 to **N=150**, pushing the broken-S1
ratio to a robust **4.08–4.28** (≈36% above threshold) while HEAD stayed at
≈1.1–1.8 — a probe that discriminates with margin on both sides of the
line:

```
HEAD ~1.1–1.8  <  [ 3.0× threshold ]  <  broken-S1 ~4.1–4.3  <  broken-S2 ~6.5
```

This pre/post falsification-with-margin discipline was then codified as a
**standing recommendation**: every complexity fix that ships a scaling probe
must ship its negative control before the Epic closes — the measured
analogue of rule #43 (infra-class substrate earns a deterministic
end-to-end check).

---

## 2. THE MODELING REALIZATION — "model remediation with algorithms"

Fixing S1/S2/N1/N2 one seam at a time treats each defect as a one-off. The
realization that reframed the whole effort: the auto-remediation pipeline
**already is a task graph** — a DAG of GenAI-invoking and deterministic
passes connected by data-flow edges — but nothing NAMES it as a graph, so
"which seams are algorithmically hot" has no queryable home and every future
agent re-derives the audit by reading code. The response was to **model
remediation with algorithms** as a first-class property: stand up an Epic
(`remediation-graph-complexity-model`) to audit AND extend the model, adding
`system-models/remediation_complexity_model.py` as a new sibling that
declares, per hot seam, a `ComplexityAnnotation` (declared Big-O + N-driver
+ `file::symbol` cite + as-built status) — governance-as-method (A.24):
convert "accidentally quadratic on a hot path" from an audit-caught class
into a modeled-and-controlled one.

That complexity model needed a substrate to attach to — a per-seam node
identity, a phase pointer, a way to say "this pass is GenAI vs
algorithmic." At almost the same time, a second Epic
([`structural-genai-determinism-measurement-260818`](../epics/near-term/structural-genai-determinism-measurement-260818/main.md),
seeded by the **33-vs-82 region-count nondeterminism** finding — a
structural GenAI call returning a materially different region count run to
run on identical input) needed the *same* kind of per-task identity to
attach a determinism-tolerance budget to. **Both Epics were independently
reaching for the same graph and half-inventing it.** The user's direction
(260818): stand up the shared substrate as its own founding design so both
consuming Epics CONSUME it rather than each drawing a slightly different
one — and stabilize the substrate first, then dispatch the two (later four)
downstream attribute designs concurrently. This is the direct link to the
performance/cost model: the graph's attribute-provider registry is exactly
where the complexity annotation, the cost budget, and the determinism
tolerance were always going to have to converge — the substrate just gives
them one join key (`NodeId`) instead of three.

---

## 3. THE NODE-vs-EDGE DESIGN CONVERSATION

The founding design did not arrive at its shape in one step. The chronicle
of the conversation itself is as load-bearing as the result, because each
correction narrowed a genuinely ambiguous modeling choice.

**The initial framing (WRONG):** nodes = GenAI tasks; edges = deterministic
tasks. This treats "GenAI-ness" as the axis that defines *what a node is*,
and relegates every algorithmic pass to being merely a connector between
GenAI nodes — which inverts the actual shape of the pipeline (most passes
ARE algorithmic; GenAI passes are the minority that need the tightest
governance).

**The user's correction:** nodes = **ALL** tasks (GenAI and algorithmic
alike), colored by a typed kind; edges = **data-flow + I/O format only** —
an edge carries no governance semantics of its own, it is purely "what
shape of data moves from producer to consumer." This is the shape that
survived into the founding design (§B, §C of
[`phase-1-design-260818.md`](../epics/near-term/remediation-graph-substrate-260818/phase-1-design-260818.md)):
`NodeKind` colors every pass as `genai-structural-deterministic` /
`genai-descriptive-creative` / `algorithmic`, and an edge is a typed
data-flow contract between two nodes, nothing more.

**Edges as typed contracts:** the next refinement asked what "data-flow
contract" should actually mean as a type. The answer split into two arms:
an **in-memory** edge (most of the pipeline — one pass handing a typed
object to the next inside the same process) is represented by a **class /
type symbol** — the contract IS the CLR/Python type, nothing to serialize;
a **JSON** edge (a cross-process/cross-service boundary, or a payload that
genuinely gets serialized for staging validation) is an **optional
serialization projection** of that same contract, reusing the existing
`wire-contracts/*.schema.json` mechanism (the canonical typed cross-language
edge SSOT with its own byte-identity drift gate) rather than inventing a new
edge-schema format.

**The node-output type-system insight:** formalizing edges as typed
contracts turned out to sharpen something that had been fuzzy for the
*nodes*, not just the edges — a node's output type is exactly the contract
of its outgoing edges, so naming edges precisely forces every node's output
to be named precisely too. This produced the design's `contract_ref: str |
None` field on `Edge` (§C.1 of the Phase-1 design): where a
producer→consumer boundary has no wire contract yet, the edge honestly
declares `contract_ref=None` rather than a hand-rolled inline shape — this
is the **untyped-output backlog**, an explicit ⚠️ as-built gap the model
publishes instead of papering over. Critically, this typing insight is
**scoped to SERIALIZED edges only** — an in-memory `DATA_FLOW` edge
legitimately needs no wire-contract schema at all, so `contract_ref=None`
is not itself a defect; it becomes one only once the edge is serialized
without a contract (the distinction the Phase-7 alignment design's "EDGE
RATCHET" facet formalizes, §4 below).

---

## 4. THE UNIFIED MODEL

The founding design (`system-models/remediation_graph.py`, materialized in
Phase 1c) landed on:

- **`NodeKind` coloring** — a closed `StrEnum` of
  `{genai-structural-deterministic, genai-descriptive-creative,
  algorithmic}` — the join key for the config-selection invariant (a
  structural node cannot silently take a creative/loose GenAI config).
- **Identity + pointers, not fields.** `RemediationNode` carries `id`
  (a stable pass slug), `kind`, and POINTERS into the existing keyspaces —
  `phase_ref` (a `PhaseId`), `genai_tasks` (a tuple of `GenAiTask` keys),
  `seam_cite` (a `file::symbol` code anchor). No attribute field lives on
  the node itself.
- **Typed-contract edges** that reuse `wire-contracts/*.schema.json` as the
  edge SSOT, with `contract_ref: str | None` and an `EdgeKind` of
  `{data-flow, mutation, cross-service}` routing which validator applies.
- **The attribute-provider registry** — a side-table keyed by `NodeId`.
  Config-kind, complexity, cost, and determinism-tolerance are NOT fields
  on the node; each is a separate provider file implementing
  `value_for(node_id) -> object | None` + `covered_nodes()`. Adding the
  5th attribute is a new provider file with **zero churn** to the graph
  model or to any other attribute's consumers — the schema-stability goal
  (rule #45) made true by construction rather than by discipline.
- **Five read-contracts** — one small typed surface per governance system
  (`derive_config_kind`, `complexity_of`, `tolerance_of`, `contract_of`,
  plus the well-formedness walker) so a consumer never reaches into the
  graph's internals directly.
- **INV-GRAPH-DECL-INERT** — like its genre precedent
  `remediation_pipeline_phases.py`, the substrate is lint-time-only
  metadata; it is never imported by the C# runtime or by `web/`. A
  `runtime_path_references()` probe holds this.

**The 4-mechanism alignment guarantee (Phase 7).** Once the substrate
existed, a separate concern surfaced: how do we know the MAP
(`remediation_graph.py`) still equals the TERRITORY (the live C# pass
registry, the wire-contract schemas, the code seams)? The Phase-7 alignment
design named four *distinct* drift mechanisms, each requiring a different
repair verb:

1. **PROJECTION** (STRONG, generative) — the node SET is projected from the
   live `PdfPassRegistry`, so it cannot be hand-copied wrong. Repair =
   *regenerate*.
2. **REFERENCE-RESOLUTION** (STRONG, deterministic) — every pointer
   (`phase_ref`, `genai_tasks`, `seam_cite`, `contract_ref`, provider
   coverage) must resolve to something real. Repair = *re-cite*.
3. **EDGE RATCHET** (WEAK — the honestly-weak facet) — the territory has no
   `EdgeRegistry` to project edges from, so edge alignment is
   runtime/ratchet-based, not generative. Repair = *author the missing
   wire-contract, then ratchet*.
4. **VALUE-DRIFT** (MEDIUM, measured) — a declared value (a complexity
   bound, a tolerance ε, a cost figure) can resolve correctly while still
   being *false* (stale relative to measured reality). Repair =
   *re-measure*.

The **ONE meta-gate** (`lint-remediation-graph-resolves.py`, AUDIT-ONLY at
landing per rule #55) consolidates the two STATIC, deterministic mechanisms
(PROJECTION + REFERENCE-RESOLUTION) into a single "does the whole model
resolve against HEAD" report — and explicitly does NOT claim to cover
VALUE-DRIFT or the EDGE RATCHET's runtime teeth, so a green meta-gate is
never mistaken for "every value is true" or "every edge is validated."

**The convergence.** This is where the origin story closes the loop: the
complexity Epic's per-seam annotation and the determinism Epic's per-call
tolerance budget do not get re-modeled — they **RE-HOME as attribute
providers** on this substrate (§G-5 of the Phase-1 design), joining by
`NodeId`/`seam_cite`. When O365 (PPTX/DOCX/XLSX) support lands (§6 below),
it **joins by population** — extending the projected node set to cover the
Office pass registries — not by re-deriving a second graph model for a
second format family.

---

## 5. DEFECTS LEDGER — LIVING, append-as-found

This section is a running record of concrete defects the graph-substrate
effort has surfaced. It is **not** a design decision log (that's §3 above);
it is specifically the *bugs and inefficiencies found along the way*, kept
here so the substrate's origin story stays connected to what it actually
fixed and what it left open.

### Seeded — the O(P²) / quadratic algorithms found by the complexity audit

| # | Seam (`file::symbol`) | Complexity found | Status |
|---|---|---|---|
| S1 | `PdfStructTreeReader::RebuildPathIndex` (via `CheckDisposed`) | `O(P·N_tree) ≈ O(P²)` | **FIXED** (Phase 2, 260818) — incremental subtree re-index; validated by negative control (§1 above) |
| S2 | `PageStructureProjector::SwapRolesOnPage`/`SwapFiguresOnPage`/`SwapHeadingsAndListsOnPage` | `O(P·N_tree) ≈ O(P²)` | **FIXED** (Phase 2, 260818) — reuse driver's one-walk bucket; validated by negative control |
| S3 | `DocxContrastMutator` resolvers via `DocxStyleChainWalker` | `O(R·S)` | queued (complexity Epic Phase 5) |
| S4 | `PdfFontMetricsExtractor` (`_current.Text += text`) | `O(block_chars²)` per block | queued (complexity Epic Phase 2, fold-in) |
| N1 | `web/chunking/merge.py::PptxMergeStrategy._patch_slides_from_chunk` — per-chunk full-deck rewrite | `O(N_chunks·E) ≈ O(slides²)`, **unconditional** on every multi-chunk PPTX job | queued (complexity Epic Phase 4) — highest blast-radius finding |
| N2/N2a/N2b/N2c | `PdfStructElemGeometry::LookupPageNumber` + `PdfActualTextRemediator::ResolvePageNumber` (dup) + 3 drivers (`PdfVisionReadingOrderRemediator::ResolvePrimaryPage`, `PdfActualTextRemediator::ResolveElementPage`/`ResolveMcrPage`, `PdfWithinPageReadingOrderChecker`) | `O(P)` per call → `O(P²)` at each driver | queued (complexity Epic Phase 3) — also a rule #11 DRY dup (two independent linear page-number scans); the fix unifies them into one `PdfPageIndexMap` |
| N3 | `PdfVisionReadingOrderRemediator::AccumulatePageReorder` (`pendingOrder.FindIndex` linear scan per page-kid) | `O(D²)` | queued (complexity Epic Phase 3, same pass as N2a) |
| N4 | `web/chunking/reuse_plan.py::slice_plan_for_chunk` + `_find_owning_chunk` | `O(N_chunks·members) ≈ O(slides²)`, gated (only when alt-text-reuse-across-slides is enabled) | queued (complexity Epic Phase 5) |

**Follow-up finding surfaced during S1/S2 negative-control hardening (260818):**
`PdfStructTreeReader.RemoveSubtreeDescendants` — the S1 "incremental"
re-index still does an `O(N_tree)` descendant scan per scoped commit
(iterates all `_pathToNode.Keys` to find the dirty-parent prefix), so HEAD's
per-page cost grows *sub-linearly* with page count (measured N=150 ≈ 1.7×
N=25) rather than staying perfectly flat. Not quadratic — a large
constant-factor win over the full rebuild remains — but a prefix-indexed
descendant lookup would make the incremental path genuinely `O(subtree)`.
Low priority; noted here so the residual is not later mistaken for a new
defect. `[FIX]` <!-- followup-domain: product -->

### Confirmed — the temp-0-without-seed structural-nondeterminism defect (calibration baseline, 260819)

**The defect.** Every `GENAI_STRUCTURAL_DETERMINISTIC` node in the graph — the
20 structural calls (region segmentation, fusion/fission, run-grouping,
reading-order judgment, role classification, marry, layout inference)
declared *should-be-reproducible* — produces run-to-run-varying structural
output even at temperature 0. A "deterministic" structural task that
silently varies is a fidelity/auditability hazard: a remediation you cannot
reproduce you cannot explain or reverse (MISSION).

**The evidence.** The Phase-2 calibration baseline
([`baseline-scorecard-260819.md`](../epics/near-term/structural-genai-determinism-measurement-260818/baseline-scorecard-260819.md))
ran `test/samples/pdfs/toy-8-untagged.pdf` through K=3 temp-0 remediations
and scored mean-pairwise structural divergence (the tolerance provider's
`struct_path`-keyed diff) against each node's ε=0.05 budget:

| Metric | Nodes | Divergence | ε | 95% CI | Verdict |
|---|---|---|---|---|---|
| `struct-tree` (whole-tree symmetric diff) | 19 | **0.476** | 0.05 | [0.238, 0.714] | FAIL |
| `group-partition` (`pdf-intra-page-vision-fuse`) | 1 | **0.133** | 0.05 | — | FAIL |

All 20 measured nodes FAIL (measured=20, PASS=0, FAIL=20) — a 1-page
fixture's struct tree is ~48% divergent across 3 identical temp-0 runs; this
is the general form of the 33-vs-82 region nondeterminism that founded the
Epic, now quantified end-to-end.

**Root cause.** OpenAI temperature=0 is NOT deterministic without a seed
(the sampler's tie-break still varies run to run), and the configured model
ids are FLOATING aliases (e.g. `gpt-5.2`), not dated snapshots — the backing
weights can shift under the same alias between calls.

**The fix arc.**
[`determinization-techniques.md`](../genai/determinization-techniques.md)'s
5-stage portfolio is the menu; technique #1 (② decode-side: temp-0 + a
STABLE per-`(job_id, task, input_digest)` seed, best-effort keyed to
OpenAI's `system_fingerprint`) is the highest-leverage first move per the
baseline's own priority order. FOUNDATION LANDED:
`DeterministicSeed.Derive(jobId, task, inputDigest)`
(`backend/src/AdaTool.GenAi/GenAi/DeterministicSeed.cs`, SHA-256 over a
NUL-separated key) plus the `OpenAiRequest.Seed` wire field
(`backend/src/AdaTool.GenAi/GenAi/OpenAiClient.cs`) — omitted when null, so
the request shape for legacy/creative calls is unchanged.

**How the graph holds it.**
`system-models/remediation_graph_config_provider.py`'s `KindConfigProvider`
declares `DeterministicConfigIntent` (temperature pinned to 0,
`requires_seed=True`) on every structural-deterministic node as a distinct,
non-unifying type from `CreativeConfigIntent` — a structural node cannot be
constructed with a seedless/creative config (the `__post_init__` validators
reject a nonzero-temperature or seedless deterministic intent immediately).
The tolerance provider's K-run scorecard above is the standing measurement
that will confirm the fix once wired.

**Status: OPEN / fix-in-progress.** `DeterministicSeed.Derive` and the
`Seed` wire field exist, but nothing yet calls `Derive` from a live
structural call site — the runtime seam wiring the seed into the structural
GenAI calls, and the post-wire re-baseline against this same K=3 harness,
are pending. Both will be appended to this ledger when they land (living
note).

---

## 6. Format parity — the O365 gap this note also exists to keep visible

As of 260818 the materialized substrate (`system-models/remediation_graph.py`)
projects its node set **exclusively from the C# `PdfPassRegistry`** — every
node is a PDF pass. Nothing in the substrate yet names a PPTX/DOCX/XLSX
pass, even though the Office remediation pipeline runs through its own
analogous registries (the `SlidesModel`/`DocsModel`/`SheetsModel` verb
catalogs feeding the masked-pass-architecture's `IPassRegistry`,
per [`docs/arch/masked-pass-architecture.md`](../arch/masked-pass-architecture.md)).
This is not a design flaw — the Epic's founding scope was deliberately
PDF-first — but it is a live risk the Epic's own DoD must name explicitly,
per the standing "don't DoD without propagation" discipline: a governance
substrate that ships covering only one of four supported formats strands
PPTX/DOCX/XLSX outside every attribute the substrate now governs (complexity,
cost, determinism-tolerance, config-selection). §5 of this note's companion
Epic edit registers a FORMAT-PARITY DoD criterion and an O365-propagation
phase so this cannot close silently PDF-only.

---

## Cross-references

- Complexity origin: [`remediation-graph-complexity-model/phase-1-design-260817.md`](../epics/near-term/remediation-graph-complexity-model/phase-1-design-260817.md),
  [`phase-2-260818.md`](../epics/near-term/remediation-graph-complexity-model/phase-2-260818.md) (S1/S2 fixes),
  [`phase-2b-probe-falsification-260818.md`](../epics/near-term/remediation-graph-complexity-model/phase-2b-probe-falsification-260818.md) (negative control).
- Substrate design: [`remediation-graph-substrate-260818/phase-1-design-260818.md`](../epics/near-term/remediation-graph-substrate-260818/phase-1-design-260818.md)
  (the unified node/edge/attribute model), [`phase-7-alignment-design-260818.md`](../epics/near-term/remediation-graph-substrate-260818/phase-7-alignment-design-260818.md)
  (the 4-mechanism alignment guarantee + meta-gate).
- Determinism half: [`structural-genai-determinism-measurement-260818/main.md`](../epics/near-term/structural-genai-determinism-measurement-260818/main.md),
  [`baseline-scorecard-260819.md`](../epics/near-term/structural-genai-determinism-measurement-260818/baseline-scorecard-260819.md)
  (the calibration numbers cited in the §5 determinism-defect entry).
- Determinization technique playbook: [`docs/genai/determinization-techniques.md`](../genai/determinization-techniques.md).
- O365 pass architecture: [`docs/arch/masked-pass-architecture.md`](../arch/masked-pass-architecture.md).
- Materialized model: `system-models/remediation_graph.py`.
- Seed audit: `scratchpad/walker-complexity-audit-260817.md`.
