# DocAble (ADATool) — the memory-then-time performance-engineering record

**Forensic reconstruction · 2026-09-23 · READ-ONLY (no repo mutation).**
Scope: reconstruct the memory-ratchet → time-ratchet sequence from repository
artifacts. Every claim is tagged **[FACT]** (grounded in a cited artifact I
re-opened), **[INFER]** (my reading across artifacts, not stated as such in
one place), or **[FLAG]** (a seed claim that did **not** verify, verified only
partially, or that I could not confirm before writing). The interpretive
argument (MAGE / kernels / "what lesson") is deliberately **not** made here —
this is the engineering record plus an honest verdict.

Cite convention: `path:line` at the repo root
`/Users/davisjam/Projects/ada-tool`. Dates are `YYMMDD` (the repo convention;
`260903` = 2026-09-03).

---

## §0. What verified, what did not (read this first)

The seed brief (a prior 3-leg forensic pass) is **largely confirmed**. The
strongest spine — the memory arc, the two time models, the counter-ratchet,
and the resource-interaction (#6) and confidence (#8) claims — all check out
against primary artifacts. A handful of specific *numbers* in the seed I could
not confirm from the artifacts before the write deadline; they are marked
**[FLAG]** below and revisited in §11.

Confirmed spine (high confidence, multiple cites each):

- Memory arc epics exist in the stated order and closed/active states (§2, §9).
- `T = (R+1)·F + G` with `ModelRefuted` on a negative fitted component (§4).
- The durable perf gate ratchets **deterministic counters, never seconds** (§4, §8).
- #6 resource-interaction: every one of the six interaction cites verified (§6).
- #8 confidence-from-model: the four "constructed/derived not measured"
  artifacts all verified (§8).
- All four honest memory retractions (§ hedges) verified, most with 3+ cites.

**RESOLVED post-write (§11 closed):** five of the six deferred cites now
**confirm** the seed — `2747→1400 MiB` (CONFIRMED), `RasterAdmissionGate` cap =
**192 MiB** per-image decoded-RGBA (CONFIRMED — my earlier `256 MiB` was a
*different* cap), lo-service `~560→12.48 s (~45×)` (CONFIRMED; the `480 s` is the
observed *timeout-incident* class, distinct from the computed 560 s serial
baseline), `802 MB@100K rows` xlsx (CONFIRMED), and `lint-no-unbounded-parallel-
foreach` = **AUDIT-ONLY** (CONFIRMED, INV-SPA-1, rule #55). Two remain soft:
the AltTextPrep `480→165` pair (the fan-out commit exists; the `165` figure not
directly located), and the earliest chronology anchors `260425`/`260609` (dated
sizing/coverage-substrate work exists at both, but the exact seed framing —
"coordinator 2.4 GiB, 10→2" and "pytest-cov OOM ~50 KB/stmt" — maps only
loosely; see §9).

---

## §2. The memory ratchet — the arc, artifact by artifact

The sequence is a chain of epics, each ratcheting one memory property from
"hoped" → "constructed + declared + machine-held", and — critically —
**refuting its own predecessor's premise where measurement contradicted it**.

**1. `streaming-downsampling-oom-guard-260829`** (closed). First OOM guard on
the streaming/downsampling path. [FACT] epic dir present under
`docs/epics/closed/`.

**2. `bounded-streaming-buffers-260830`** (closed). The pivotal *epistemic*
move. The epic's own title states the thesis:

> "Make the streaming-heap O(1)-in-payload bound a **CONSTRUCTED + declared-invariant + lint-held guarantee, not a measured property**"
> — `docs/epics/closed/bounded-streaming-buffers-260830/main.md:3` [FACT]

- The seam: `shared/bounded_stream.py` [FACT, file present].
- The enforcement: `tools/lint/lint-bounded-streaming-read.py`, registered
  **BLOCKING** at `tools/lint/lint_all/registrations/batch_a.py:804` [FACT].
- **INV-BSB-4** = "O(1) allocations — a bounded copy of an N-byte stream
  performs a CONSTANT number of buffer allocations (independent of N)",
  verification tier **LINEAR_PROPERTY**, pinned by a buffer-reuse property test
  in `shared/test_bounded_stream.py` (Phase 2) —
  `docs/epics/closed/bounded-streaming-buffers-260830/main.md:80` [FACT].

  **[FLAG — seed nuance]** The seed attributes the "CONSTRUCTED not measured"
  wording to INV-BSB-4 itself. Precisely: that wording is the **epic title**;
  INV-BSB-4 is the narrower **allocation-count property test**, and the
  "lint-held" leg is the *separate* seam lint above. The distinction matters
  for #8: the O(1) claim is held by **three** distinct mechanisms (seam +
  BLOCKING lint + property test), none of which is a peak-RSS measurement. The
  Phase-1b review makes this explicit: "a seam with no [test] is NOT enough" —
  `phase-1b-review-260830.md:116`.

**3. `chunkless-produce-memory-bounding-260831`** (closed). The lever:
**media-by-reference *inside* the C# produce capture** — emit a
content-addressed local ref `media://<sha256>` + spill bytes to a
content-addressed sidecar, so the produce heap stays O(1) in media bytes.
`docs/epics/closed/chunkless-produce-memory-bounding-260831/main.md:108,116,141`
[FACT]. The seed's headline number **CONFIRMED**: pptx-250 peak RSS **2747.3 MiB**
pre-fix (`chunkless-latency-calibration-260831/measurement-260831.md:52` +
`chunkless-produce-rss-sweep-260831.141450.json:29`), and "**post the
memory-bounding pipe lever, 2747→1400**" —
`chunkless-pptx-pilot-260830/phase-rc1-local-rig-reconcile-260902.md:62` [FACT].

**4. `service-memory-sizing-model-and-safety-margin-260901`** (active). The
sizing *model of record*: `system-models/service_sizing.py`.
- Form: `M = round_up_tier( (1 + margin) × (per_request_peak_mib + native_reserve_mib) )`
  — docstring `service_sizing.py:14`; the arithmetic at
  `service_sizing.py:317` (`math.ceil((1.0 + margin_fraction) × (peak + reserve))`)
  with `SAFETY_MARGIN_FRACTION = 0.30` (i.e. the seed's `1.30×`) [FACT].
- Asymmetric-failure rationale is explicit: "OOM = hard SIGKILL; over-provision
  = soft [cost]" — `service_sizing.py:76` [FACT]. This is *why* the margin is a
  one-sided ratchet.

**5. `adversarial-memory-bound-falsification-260903`** (active). The
falsification. It **refuted input-independence** of the memory bound:
- pptx-image: **+2.115 MiB peak per MiB decoded area** (379 → 1523 MiB),
  "steeply rising" —
  `adversarial-memory-bound-falsification-260903/phase-1-measurement-260903.md:109`
  [FACT]. pdf sibling +0.876 (135 → 581 MiB), confirmed via the density-router
  Phase-1b cross-cite (`density-routed-…/phase-1b-review-260904.md:36`).
- Committed measurement JSON:
  `adversarial-memory-bound-falsification-260903/adversarial-memory-sweep-260903.171944.json`
  and the sweep tool `tools/perf/adversarial_memory_sweep.py` [FACT].
- Response gate: **`RasterAdmissionGate`** — called in
  `backend/src/AdaTool.Cli/Chunkless/ChunklessLocalRunner.cs:135-137`
  (`RasterAdmissionGate.Admit(...)`), rejects with `##INPUT_LIMIT_EXCEEDED##` +
  exit 6 [FACT]. The seed's "192 MiB cap" **CONFIRMED**: the SoT constant
  `RasterAdmissionGate.MaxDecodedRgbaBytesPerImage = 192L * 1024 * 1024` (192 MiB
  = ~48 megapixels **per image**) —
  `backend/src/AdaTool.Cli/Shared/RasterAdmissionGate.cs:87` (+ the PDF sibling
  `Pdfs/Shared/PdfRasterAdmissionGate.cs:18` reuses the same SoT) [FACT]. (My
  §0 caveat about a `256 MiB` cap was a *different* constant — a source-decode
  guard — not this per-image decoded-RGBA admission cap.)

**6. `remediation-stage-memory-streaming-260922`** (active — **the current
front**). Phase-9 found the vision-validation pass
`pdf.StructAltTextValidation` allocating **+440 MiB mean** from unbounded
`Parallel.ForEach` over Magick.NET **native** decodes —
`phase-9-structure-pass-allocation-design-260922.md:17` (seed's `+439.5`
rounds to this `+440`) [FACT]. OFF baseline whole-run peak RSS **mean 770.6 MiB,
σ 110.6** across 5 runs — `phase-9-…-260922.md:50` [FACT]. The fix (V1):
`TranscodeAdmission` K_t=4 + `ParallelFanOut.Run` width 8 over page groups →
NASA-131pp **770.6 → 464.8 MiB, CV 14.3% → 1.6%**, `K_t∈{1,4}` verdict-identical
— `fable-audit-transcode-offload-260923.md:66-67` [FACT].
- Companion lint `tools/lint/lint-no-unbounded-parallel-foreach.py`
  (INV-SPA-1), registered `tools/lint/lint_all/registrations/batch_e.py:9658`
  with `blocking=True, audit_only=True` — i.e. **AUDIT-ONLY-first (rule #55)**,
  "promote to BLOCKING after one clean session re-verifies 0 at HEAD". The
  census found the unbounded class was "exactly the 3 Sense-B validator
  adapters, all now bounded by the Phase-9c fix" [FACT — registration comment +
  flags read]. Seed CONFIRMED.
- **HONESTY, load-bearing:** V1 is on **branch
  `worktree-agent-af464d45b0253ca6c` (ready-for-merge-train)** —
  `fable-audit-…-260923.md:62` — i.e. **not yet landed on main**. The current
  front is *in-flight*, not closed. Any "the ratchet held here" claim is a
  claim about a branch, not about `main`.

---

## §4. The time ratchet — two models + a counter gate

**Two models, both in `system-models/`:**

1. `chunkless_time_complexity_model.py` — the envelope `T = (R+1)·F + G`
   (`t_chunkless_s = (R+1)·F + G`, `:549,565`; the "+1" is the apply pass,
   `:140`). Falsifiability seam: `fit_from_ground_truth` inverts the envelope
   against a measured (monolith, chunkless) pair and **raises `ModelRefuted`
   (a `ValueError` subclass) when any fitted component is negative** — e.g. a
   chunkless time *below* monolith — `:52-54, :182-186` [FACT]. This is A.3
   "ground truth" made executable: the model can be *killed* by data.

2. `chunkless_critical_path_model.py` — the IR-dependency-chain floor (71 KB,
   present) [FACT, file present; internal shape not re-read this pass].

**The durable gate ratchets counters, not seconds.**
`deploy/chunkless-perf-ratchet/baseline.json` [FACT, full file read]:
- Counters: `produce_rounds`, `genai_call_count`, `capture_invocations`,
  `render_invocations`, **`genai_hop_count`**. The first four are the seed's
  "QUAD"; `genai_hop_count` is a 5th, listed under `audit_only_counters` —
  observed (`PerfRatchet_GenAiHopCount_AuditOnly`) but does **not** yet fail on
  a rise (AUDIT-ONLY-first, rule #55). [FACT — corrects seed's "four": it is
  four BLOCKING + one AUDIT-ONLY.]
- `ChunklessComplexityRatchetTests` re-measures the live side every run and
  asserts **measured ≤ baseline per counter (INV-PR-1)**; a RAISE requires a
  named justification in `history` (INV-PR-4, "never a silent bump")
  [FACT, from the baseline.json `provenance` + `history` blocks].
- **Wall-time is deliberately excluded.** The env fingerprint's
  `determinism_preconditions` states the QUAD is "host-independent" precisely
  because fixtures are generated in-process (no soffice/pdftoppm), DOM-derived
  content-addresses exclude volatile pixels, and serial order is asserted
  [FACT]. Seconds are never ratcheted — see §8.

**The 260920 question — "are we fully exhibiting O(GenAI-calls)?" — answered
NO at real size.** The model's own provenance note records the docx pair "44 s
monolith vs ~150 s / ~2.5 min chunkless" — `chunkless_time_complexity_model.py:49`.
Because `(R+1)·F` multiplies the **whole-doc** produce cost `F` by the round
count, the chunkless path is O(rounds × whole-doc-work), **not** O(GenAI-calls);
the round multiplier — not the number of model calls — dominates at real size
[FACT for the model shape; the seed's specific "8 rounds × ~145-215 s ≈ 21.9
min" I did not re-derive].

---

## §5. Recurring wasted-time causes (the time ratchet's targets)

Each is a *class* of waste the time work attacked; grouped by mechanism.

- **(a) Whole-doc re-parse/re-render × (R+1) rounds.** Direct consequence of
  the `(R+1)·F` envelope (§4): every produce round re-does whole-doc work.
  Levers: lazy-render / per-job render-cache; an in-process fixpoint was
  **DEFERRED / NO-GO** (`chunkless-inprocess-produce-fixpoint-260921` exists as
  an epic) [FACT epic present; W-numbering from seed].
- **(b) Serial-in-a-loop metafile normalize.** Two headline wins:
  - AltTextPrep EMF/WMF metafile normalize → **bounded parallel fan-out**
    (commit `442461d061` "feat(pptx-alttext): bounded parallel EMF/WMF
    metafile-normalize fan-out", 260909) [FACT commit]. Seed's `~480 s → ~165 s`:
    the `480 s` end is confirmed (below); the `165 s` figure I did not locate —
    [FLAG, soft].
  - lo-service `/convert-batch`: N files → **one** soffice invocation (commit
    `3f6f12552c`, 260909) [FACT commit]. **CONFIRMED**: a full 166-file batch
    measured **12.48 s** vs a **~560 s serial baseline** (~3.4 s/file × 166) =
    **~45× faster** — `lo-service-batched-render-260909/main.md:51-52`,
    `phase-1b-review-260909.md:62-66` [FACT]. The **480 s** is the observed
    *timeout-incident* the 560 s serial baseline is drawn from — a distinct
    number, not a contradiction.
- **(c) Full-doc re-upload per page** → render-loop `/render-batch`
  (`render-loop-serial-parallelize-260914`, closed) [FACT epic].
- **(d) XLSX whole-grid DOM materialization** → SAX row-streaming
  (`xlsx-row-streaming-260912` + `-large-spreadsheets-260912`, both closed)
  [FACT epics]. Seed's **`802 MB @ 100K rows` CONFIRMED** —
  `xlsx-row-streaming-260912/main.md:15`, `phase-1-260912.md:12`; and diagnosed
  "100% stage-(a) LOAD — the DocumentFormat.OpenXml SDK materializing the entire
  `SheetData` DOM (~500K `Cell` + 100K `Row` objects)" (`phase-1-260912.md:22,59`)
  [FACT].

**[FACT, and load-bearing for the verdict]** Both headline wall-clock wins (b)
are "**un-serialize a local loop**," **not** "call GenAI less." The GenAI-call
count is what the *counter ratchet* protects (§4); the wall-clock wins are
CPU-fan-out wins on local metafile work. These are different levers on
different resources.

---

## §6. Resource interaction (PRIORITY) — memory and time are coupled, explicitly

This is the strongest part of the record. In every instance below, a
**time/throughput** fix is *gated by* or *delegates to* a **memory** model —
the two ratchets are wired to each other, not run in isolation. All six cites
verified.

1. **lo-service `/convert-batch` chose batching PARTLY on a memory argument.**
   The concurrent fan-out alternative measured **855 MiB at width-3 (854.6
   measured), 2.3 GiB at width-8** — "both of which already breach the 512Mi
   [ceiling]" — `lo-service-batched-render-260909/main.md:54-56`. Batched peak
   is bounded: **`peak_RSS(N) ≈ 285 + 15·log2(N)` MiB** (corrected by Phase-1b
   R-a) — `main.md:185`, `phase-1b-review-260909.md:87-97` [FACT]. The
   throughput design was selected on the memory Pareto, not just speed.

2. **The concurrency-sizing model DELEGATES memory feasibility to the RSS
   model.** `chunkless_concurrency_sizing_model.py:35` — "**F2 (memory):
   delegated to `worker_rss_sizing_model.predict_peak_rss`**"; `:594` "F2 —
   memory feasibility DELEGATED (INV-CCS-3): no memory arithmetic here" [FACT].
   The time/concurrency model refuses to *reason about memory itself*; it hands
   that to the memory model of record.

3. **`concurrent-fanout-executor` INV-FEM-5 makes width the explicit peak-memory
   multiplier — naming the coupling.** Verbatim: "the wall-time fix CAN create a
   memory offender … INV-FEM-5 makes `W` the explicit **peak-concurrency
   multiplier** so the consumer sizes it against its **memory Pareto**" —
   `concurrent-fanout-executor-260912/main.md:63-64`,
   `phase-1-design-260912.md:339-343` [FACT]. The design *anticipates* that its
   own time fix is a memory hazard and exposes the knob so the memory side can
   bound it.

4. **render-loop INV-RLP-2 / `assert_render_fanout_memory_safe` — a fail-loud
   memory guard on the render *time* fix.** `K_r × (raster(dpi) + RSS est) ≤
   RENDER_FANOUT_BUDGET_BYTES` or raise —
   `render-loop-serial-parallelize-260914/phase-1-design-260914.md:135,261`;
   the C# analogue `RenderConcurrency.AssertMemorySafe()` (INV-MEM-5) is called
   in `PdfPageRenderer.cs:174-177` [FACT]. **[FLAG]** seed's specific "≤1 GiB"
   budget; the doc names `RENDER_FANOUT_BUDGET_BYTES` / "~360 MB at default" —
   the *guard exists*, the exact ceiling number differs from seed.

5. **The density-router consumes the adversarial epic's measured slopes.**
   `density-routed-downsample-vs-stream-260904/phase-1-260904.md:75` uses
   "pptx (intercept 347, slope **2.115**)"; Phase-1b P-6 CONFIRMS the model is
   the input-cap slopes measured in the adversarial epic
   (`phase-1b-review-260904.md:36`) [FACT]. The routing (a fidelity/latency
   decision) is parameterized by the memory-falsification measurements.

6. **chunkless-latency-calibration's PROD deploy was gated RED purely on a
   memory sweep.** "Verdict RED: NOT O(1) (~O(√N), 2.7–4.1 GiB peak) … the
   user's prod-gate returns RED: BLOCK extreme-scale deploy" —
   `chunkless-latency-calibration-260831/main.md:60,72-73`;
   `measurement-260831.md:65-67` (pptx-250 2.7 GiB, 310 MB image-hog PDF 4.1
   GiB) [FACT]. A *latency* epic's deploy was blocked by a *memory* finding.

**[INFER]** Taken together, these are not six coincidences: the codebase
routes time/concurrency decisions *through* the memory model (delegation #2),
exposes concurrency as the memory multiplier (#3), and blocks throughput
deploys on memory verdicts (#6). The coupling is designed and machine-visible,
not incidental.

---

## §7. Agent degrees of freedom

**[INFER, grounded in the mechanisms below]** The sequence progressively
*removes* latitude from the agents doing the work — each ratchet converts a
"trust the agent to have thought about it" into a machine check:

- **Memory:** the BLOCKING `lint-bounded-streaming-read.py` (§2) forbids an
  agent from reintroducing an unbounded read; `service_sizing.py` is the *model
  of record* so an agent cannot hand-pick a `--memory` tier off-model;
  `RasterAdmissionGate.Admit` (§2) rejects oversized input at runtime regardless
  of what an agent's code path does; `AssertMemorySafe()` / INV-FEM-5 (§6) force
  a fan-out author to declare the width as a sized multiplier.
- **Time:** the counter ratchet (§4) refuses a cross-mode compare and refuses a
  silent counter RAISE (INV-PR-4) — an agent cannot land a change that spends
  more produce-rounds/GenAI-calls without a **named justification in `history`**.
- **The falsifiability seams** (`ModelRefuted`, §4; the adversarial refutation,
  §2) mean an agent's *model claim* can be killed by a measurement the agent
  did not choose.

The freedom that **remains**: wall-clock is *not* ratcheted (§8), so an agent
has latitude on seconds; and AUDIT-ONLY lints/counters (unbounded-parallel;
`genai_hop_count`) *observe* but do not *block*, so an agent can regress those
with only an audit trail, not a gate. [FACT for which are AUDIT-ONLY;
[INFER] for the "freedom that remains" framing.]

---

## §8. Confidence — from a model vs from repeated runs (PRIORITY)

The recurring, deliberate pattern: **confidence in the memory/time bounds comes
from a construction or a derivation, not from "it ran fine N times."** Four
artifacts, all verified:

1. **The O(1) streaming bound is CONSTRUCTED + declared + held, explicitly "not
   a measured property"** — the epic title itself (§2,
   `bounded-streaming-buffers-260830/main.md:3`). A peak-RSS sweep could only
   ever say "O(1) on the inputs we tried"; the seam + BLOCKING lint + allocation
   property test say "O(1) by construction, enforced forward." [FACT]

2. **The perf gate ratchets deterministic counters, not noisy seconds.** Because
   the QUAD is host-independent by construction (§4), the gate asserts an exact
   integer inequality per fixture — confidence from a *deterministic
   measurement of a structural quantity*, not from a distribution of wall-clock
   samples. [FACT]

3. **`M = 1.30 × (peak + reserve)` is a sizing MODEL, and a lint derives each
   service's `--memory` from it** (`service_sizing.py`; the model is the
   authority, not a hand-tuned per-service number). Confidence in "this service
   won't OOM" is a property of the *model + margin*, checked against every
   service, not an inference from "prod hasn't OOM'd lately." [FACT for the
   model + margin; the "lint derives --memory" leg is stated by the model
   docstring — I did not re-open the deriving lint this pass.]

4. **`RenderConcurrency.AssertMemorySafe()` fails loud from an ESTIMATE**, before
   the fan-out runs (`PdfPageRenderer.cs:174-177`, "fail loud if the fan-out
   degree would blow the render memory budget") — confidence is a *pre-flight
   computed bound*, not a post-hoc observation of survival. [FACT]

**The contrast the record makes:** after each of these, one can claim something
that **repeated successful runs alone could not** — "O(1) in payload *for all
inputs*" (not just the tried ones), "this counter *cannot* rise silently", "no
service is *mis-sized relative to the model*", "this fan-out *cannot* exceed the
budget." Successful runs establish "hasn't failed yet"; these establish "cannot
fail in the named way, and the failure is caught at build/pre-flight." [INFER,
directly supported by the four FACTs above.]

**But — the honest counterweight (see hedges):** several *inputs* to these
models were themselves measured **wrong** and later retracted, and the headline
memory measurements are dev-host `ru_maxrss` which **under-counts** the
container sum. Confidence-from-model is only as good as the measured constants
fed in, and the record shows those constants were fallible.

---

## §9. Dated chronology

| Date | Event | Status |
|------|-------|--------|
| 260425 | First sizing — `docs/design/k8s-resource-sizing-260425.md` exists (superseding `k8s-resource-tuning-260424`, INDEX:790) | **[FLAG, soft]** dated sizing doc confirmed; exact "coordinator 2.4 GiB, 10→2" numbers not re-read |
| 260609 | Coverage/substrate RCAs dated 260609 (`coverage-zone-a-web-substrate-rca-260609.md` et al.) | **[FLAG, soft]** dated work exists; the seed's "pytest-cov OOM ~50 KB/stmt" framing maps more cleanly to `pytest-memory-mediator-260630` — likely a chronology conflation |
| 260828 | Large-media reframe (`large-media-separable-remediation-260828`) | [FACT] epic + `final-opus-dod-260901.md` present |
| 260829 | `streaming-downsampling-oom-guard-260829`; `chunkless-distribution-model-260829` | [FACT] |
| 260830 | `bounded-streaming-buffers-260830`; `chunkless-critical-path-latency-model-260830` | [FACT] |
| 260831 | `chunkless-produce-memory-bounding-260831`; `chunkless-latency-calibration-260831` | [FACT] |
| 260901 | `service-memory-sizing-model-and-safety-margin-260901` | [FACT] |
| 260903 | Adversarial falsification + `RasterAdmissionGate`; density-router founded | [FACT] |
| 260908 | `chunkless-concurrency-sizing-methodology-260908` | [FACT] |
| 260909 | `lo-service-batched-render-260909` + `merge-train-execution-resource-cap-oom-260909` | [FACT] |
| 260912 | `xlsx-row-streaming-260912`; `concurrent-fanout-executor-260912` | [FACT] |
| 260914 | `render-loop-serial-parallelize-260914` | [FACT] |
| 260920 | `chunkless-perf-ratchet-260920` (TIME — counters); `chunkless-perf-optimization-campaign-260920` | [FACT] |
| 260921 | `chunkless-inprocess-produce-fixpoint-260921` (fixpoint DEFERRED) | [FACT] |
| 260922 | `remediation-stage-memory-streaming-260922` (**current front, in-flight on a branch**) | [FACT] |

The **memory** epics cluster 260828–260903; the **time** counter-ratchet is
260920. That ordering — memory bounding and its falsification *precede* the
durable time gate — is [FACT] from the dates. Whether that constitutes
"memory-first → envelope → time-within-envelope" as a *strategy* is the verdict
question (§10).

---

## §10. The honest hedges (do NOT sand these off)

Four memory premises were measured **FALSE** and retracted in the open:

1. **"~2.4 GiB iText whole-file DOM"** → actually **≈1 MiB live** (memory-mapped
   `RandomAccessSource`; the image bytes sit off the managed heap). REFUTED with
   5+ independent cites:
   `chunkless-produce-memory-bounding-260831/phase-2-pdf-release-gc-measurement-260831.md:21-24`;
   `render-off-worker-…/pdf-memory-consolidation-260902.md:81`;
   `per-format-complexity-soundness-sweep-260914/phase-2-memory-o1-rca-260914.md:65-70`;
   `large-pdf-chunkless-at-scale-260915/phase-1-260915.md:69`. [FACT, strong]

2. **Skeletonization** (strip embedded media pre-produce) — **REFUTED + PARKED**:
   "would render blank figures; does not bound the dominant render-fed capture
   term" — `docs/field-notes/memory-optimization-sequence-260831.md:251`;
   `large-media-separable-remediation-260828/final-opus-dod-260901.md:107`. [FACT]

3. **Render-off-worker "worker proj ~90–120 MiB via render-off"** — **REFUTED**:
   render already runs off the worker; moving it reclaims only **≈6 MiB** — the
   `media-by-ref-render-ir-260831` stub's memory claim was refuted by its own
   landed beachhead phases —
   `render-off-worker-durable-cloudtasks-260902/main.md:15` +
   `pdf-memory-consolidation-260902.md:53,144`. [FACT, strong]

4. **"Office ~510 MiB floor"** — attributed pending measurement. Supported
   indirectly: `service_sizing.py` carries a `MEASURED_PENDING_STAGING`
   provenance enum (`:148,868`) — "the honest interim for a row measured LOCALLY
   (dev-host)" that only flips to `MEASURED` at staging. **[FLAG]** the specific
   `510 MiB` number I did not confirm (grep hits were noise); the *discipline* it
   names is confirmed.

Plus three method-level honesties:

5. **The time model's docx ground truth (44/150/R=4) is a MISATTRIBUTED
   mock-leaf figure.** The model's own provenance note:
   "the '44.0 s' figure was a `--leaf mock` F-side figure (round 4/8) from a
   REAPED worktree" — `chunkless_time_complexity_model.py:153-166`. Stale
   citation; the model *shape* stays code-derived (`chunkless_coordinator.py:844`
   loop), but the anchoring number's provenance is broken and flagged in-code.
   [FACT]

6. **Wall-clock is NEVER ratcheted** — only counters (§4, §8). [FACT]

7. **Dev-mac `ru_maxrss` under-counts the container sum** — hence the standing
   `MEASURED_PENDING_STAGING` → staging-cgroup-peak discipline
   (`service_sizing.py:52`). The headline memory numbers are dev-host measures.
   [FACT]

8. **The merge-train sizing model was 2× low and was recalibrated.** The width-2
   deploy-scope sweep was modeled ≤4 GiB; **49 measured sweeps showed median
   8275 / max 10860 MiB**, so `predicted_rss_mb` was recalibrated **4096 →
   8192** — `merge-train-execution-resource-cap-oom-260909/main.md:50,70`;
   `phase-5-finish-260910.md:37,52`. [FACT, strong] A memory *model* being
   caught 2× low by measurement is itself evidence for the #8 counterweight.

---

## §10b. VERDICT — does the record support memory-first → envelope → time-within-envelope?

- **Partially, and more weakly as a *deliberate strategy* than as an
  *observed sequence*.** The **dates** (§9) do show memory bounding + its
  falsification (260828–0903) landing *before* the durable time counter-ratchet
  (260920), and #6 shows time decisions genuinely *delegating to / gated by* the
  memory model. That much is [FACT]. But the record does **not** contain a
  document that says "we are protecting a memory envelope, now we optimize time
  inside it" — that framing is [INFER] the requester would be supplying. The
  epics read as *problem-driven* (an OOM here, a slow loop there), not as a
  premeditated two-phase plan.

- **Weakest link #1 — the "envelope" was never static.** It was refuted and
  re-measured repeatedly *throughout* the time work: the iText 2.4 GiB premise
  (→1 MiB), the 90–120 MiB render-off projection (→6 MiB), skeletonization
  (parked), and the merge-train model caught 2× low (4096→8192). The memory
  bound was a moving, fallible target *during* the time phase, not a sealed
  envelope the time work operated safely within.

- **Weakest link #2 — the current memory front is in-flight, not closed.** The
  260922 remediation-stage fix (V1, K_t=4) lives on a `ready-for-merge-train`
  branch, not on `main` (§2). So "memory is handled, time is the frontier" is
  not even true at HEAD — a memory OOM class was being actively bounded *after*
  the time ratchet landed.

- **Weakest link #3 — the two ratchets protect different resources by different
  epistemics, and the two headline time wins aren't "less GenAI."** The counter
  ratchet protects GenAI-call/produce-round *counts*; the wall-clock wins are
  local-loop parallelization (§5). Calling both "the time ratchet within a
  memory envelope" flattens a real distinction: one is a deterministic-counter
  gate, the other is un-ratcheted seconds. And the strongest, cleanest evidence
  is actually **#6 (coupling)** and **#8 (confidence-from-construction)** — the
  record supports *"memory and time are explicitly coupled and both bounded by
  construction rather than by repeated runs"* far more strongly than it supports
  a clean *temporal* memory-then-time strategy.

---

## §11. Open cites — RESOLVED

All six deferred cites closed post-write:
1. pptx-250 `2747 → 1400 MiB` — **CONFIRMED** (§2.3;
   `measurement-260831.md:52`, `phase-rc1-local-rig-reconcile-260902.md:62`).
2. `RasterAdmissionGate` cap — **CONFIRMED 192 MiB per-image decoded-RGBA**
   (`RasterAdmissionGate.cs:87`); my §0 `256 MiB` was a different (source-decode)
   guard.
3. `lint-no-unbounded-parallel-foreach` — **CONFIRMED AUDIT-ONLY** (INV-SPA-1,
   `batch_e.py` `audit_only=True`, rule #55).
4. lo-service `~560 → 12.48 s (~45×)` — **CONFIRMED** (`main.md:51-52`); `480 s` =
   the timeout-incident class. AltTextPrep `480 → 165` — `480`/fan-out confirmed,
   `165` **[FLAG, soft]** not located.
5. xlsx `802 MB @ 100K rows` — **CONFIRMED** (`xlsx-row-streaming-260912/main.md:15`).
6. Chronology `260425` / `260609` — dated artifacts exist at both; exact seed
   framing **[FLAG, soft]** (260609 likely conflated with `pytest-memory-mediator-260630`).

**Net:** the seed's substantive claims verify. The only residual soft spots are
one wall-clock endpoint (`165 s`) and the precise identity of the two earliest
(pre-arc, 260425/260609) chronology anchors — neither affects the §10b verdict.
