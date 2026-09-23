# R2-response-A — Publication-ready structural exports (items #1, #2, #3, #6)

**Round:** 2 (response A)  **From:** DocAble repo owner (Fable evidence-extraction pass)  **To:** Chapter-2 reviewer
**Responds-to:** next-request.md items 1, 2, 3, 6  **Model:** Fable  **Date:** 2026-09-22

---

## 0. Commit provenance and the freeze reconciliation (read this first)

The R1 baseline is commit `3baabd775d`. The repo HEAD at this extraction is `621c05852a` — **80 commits later**. Rather than claim a freeze I could not honor, I verified byte-equivalence of every authoritative source these four exports read:

- `git diff --name-only 3baabd775d HEAD -- system-models/ web/jobtypes/statemachine.py` returns exactly 7 paths: `system-models/README.md`, `config/capability_map_reader.py`, `interservice_edges.py`, `services/chrome-render-service-component.yaml`, `services/worker-chunkless-component.yaml`, `test_capability_map.py`, `traceability_builder.py`. **None of these feeds items 1, 2, 3, or 6.** In particular `system-models/state_machines.py` (invariant corpus), every `system-models/_*_invariants.py` sibling, `system-models/remediation_graph.py` (the graph), and `web/jobtypes/statemachine.py` (the lifecycle tables) are **byte-identical between 3baabd775d and HEAD**.
- The set of files declaring `MODEL_FORM` is **set-identical at both commits** (130 = 130, `diff` of the two `git grep -l` lists is empty).
- The C# parity sources the graph reads live (`PdfPassRegistry`, `DocxPassRegistration.cs`) are likewise unchanged: `git log 3baabd775d..HEAD -- backend/src/AdaTool.Cli/Documents/DocxPassRegistration.cs` is empty, and the one parity finding reported below reproduces identically at the baseline.

**Conclusion: every number and every emitted artifact below is simultaneously HEAD-accurate and baseline-frozen.** R1's headline counts reconcile exactly: 86 invariants (64 LINEAR_PROPERTY + 20 SAFETY_BFS + 2 LIVENESS_TLC), 130 `MODEL_FORM`-declaring files. One R1 number gets a *sharpening* (not a correction) in §4: the 130 splits as 129 loaded model records + 1 dynamically-tagged test fixture.

### Deliverable side-files (all in this directory; all render-verified)

| File | Item | What it is | Render with |
|---|---|---|---|
| `R2-graph-full-260922.dot` | #1 | Full remediation graph: 128 nodes, 57 edges, format-lane clusters | `dot -Tsvg R2-graph-full-260922.dot -o graph.svg` (verified renders clean) |
| `R2-graph-subgraph-260922.dot` | #1 | Bounded 16-node CONTROL_GATE-vs-DATA_FLOW explainer subgraph | same |
| `R2-invariant-corpus-260922.csv` | #2 | All 86 invariants, 12 columns (incl. `full_description`, `temporal_predicate`, `hairy`) | any CSV tool |
| `R2-lifecycle-260922.dot` / `.mmd` | #3 | Chunk lifecycle, mechanically exported, forbidden edges annotated | `dot` / any Mermaid renderer |
| `R2-lifecycle-parent-260922.dot` / `.mmd` | #3 bonus | Parent-job lifecycle, same mechanical exporter | same |
| `R2-model-census-260922.csv` | #6 | All 130 model records, 6 columns | any CSV tool |

Everything was produced by one extraction script (mechanical, no hand-drawing); the inline tables below are generated from the same CSVs, so table and side-file cannot disagree.

---

## 1. Item #1 — Full graph export: the remediation graph

### 1.1 What the model is

`system-models/remediation_graph.py` (4,195 lines; `MODEL_KIND = "PRODUCT"`, `MODEL_FORM = "DATAFLOW"`) is the authoritative projection that names DocAble's auto-remediation pipeline as a first-class task graph. Its own docstring states the design contract precisely: nodes are remediation passes "colored by a typed `NodeKind`; edges = typed data-flow contracts that REUSE the wire-contracts schema mechanism; governance attributes attach through a side-table provider registry (NOT fields on the node)." It is deliberately **inert** (INV-GRAPH-DECL-INERT): lint-time metadata, never read on the runtime remediation path — the model *describes and governs* the factory, it does not *run* it.

Two live-parity reads keep the model equal to the territory (rule #42 — never snapshot what you can look up): `node_parity_drift()` re-reads the actual `new <Name>Pass()` instantiations from the C# `PdfPassRegistry` at check time (BLOCKING), and `office_node_parity_drift()` re-reads the `<Fmt>PassId` C# enums (AUDIT-ONLY-first, rule #55).

### 1.2 Counts (executed at extraction, from the loaded model)

**Nodes: 128** (`NODES` = `_PDF_NODES + _PPTX_NODES + _DOCX_NODES + _XLSX_NODES`, `remediation_graph.py:1659`), partitioned:

| Axis | Distribution |
|---|---|
| `NodeFormat` (lane) | PDF 66, PPTX 29, DOCX 20, XLSX 13 |
| `NodeKind` (determinism/authoring posture) | ALGORITHMIC 72, GENAI_STRUCTURAL_DETERMINISTIC 41, GENAI_DESCRIPTIVE_CREATIVE 15 |
| `TelemetryKind` (what telemetry the node OWES) | DECISION 75, TRANSFORMATION 43, TIMING_ONLY 10 — the 75 DECISION nodes declare 76 closed `decision_points` |
| `GraphTier` (graceful-degradation cascade) | FINE 126, STRUCTURE 1, TEXT 1 |
| `MutationKind` | DIRECT_EDITOR 108, TYPED_PATCH_PRODUCER 15, PARTIAL_TYPED_PATCH_PRODUCER 5 |
| `ApplySeam` | NONE 108, NEUTRAL_DOC_EDIT 11, OOXML_EDIT_RUNNER 9 |
| `NodeRole` | REMEDIATE 128, CHECK 0 (the checker sink node is a designed-but-not-yet-landed Phase 3) |

**Edges: 57** (`EDGES` = 2 seed + 55 projected, `remediation_graph.py:2165`; the projected set is folded from *live reads of the C# pass sources* via `read_live_pass_io()` → `fold_edges()`, and `edge_projection_drift()` holds the declared set equal to the projection, BLOCKING):

| `EdgeKind` | Count | `contract_ref` coverage |
|---|---|---|
| DATA_FLOW | 32 | **0 of 32 carry a wire-contract stem — every one is a published as-built gap (`contract_ref=None`, A.18)** |
| CONTROL_GATE | 24 | always `None` by definition (a boolean gate carries no payload) |
| CROSS_SERVICE | 1 | 1 of 1 — `marker-pass-fidelity` (the `pdf-struct-alt-text-gen-ai → pdf-handwritten-cleanup` process-boundary edge) |
| MUTATION | 0 | — |

By producer lane: PDF 35, PPTX 12, DOCX 6, XLSX 4.

The DATA_FLOW/CONTROL_GATE separation is the semantic heart of the export (docstring, Q3-ratified): a pass that reads a producer's output *only to gate whether it runs* (`ShouldRun` / route-gate read) projects as CONTROL_GATE, kept **out** of the clean data-dependency relation, and is excluded from the downstream serialize-and-check because it is a payload-free boolean (`is_payload_bearing`). This is exactly why one classifier decision fans out to a dozen dashed edges in the figure while the solid DATA_FLOW spine stays sparse and readable.

**Topology.** Only 50 of 128 nodes participate in any edge; they form 10 weakly-connected components of sizes **19, 10, 5, 4, 2, 2, 2, 2, 2, 2**. The remaining 78 nodes are edge-isolated — passes with no *modeled* inter-pass data dependency (each reads/writes the document Model directly). For the book: the graph is honest about this; it does not invent connectivity, and the isolated majority is itself a finding about pass architecture (most passes compose through the shared document Model, not through pass-to-pass hand-offs — the edges mark the exceptional explicit contracts).

### 1.3 The emitted DOT (`R2-graph-full-260922.dot`)

- **Stable node IDs**: the pass slug (`slug_for_pass` over the C# class name, e.g. `PdfStructAltTextGenAiPass` → `pdf-struct-alt-text-gen-ai`) — the same key every attribute provider joins on, so the figure's IDs are the model's IDs.
- **Node kinds**: fill color = `NodeKind` (gray ALGORITHMIC / blue GENAI_STRUCTURAL_DETERMINISTIC / orange GENAI_DESCRIPTIVE_CREATIVE); double border = `TelemetryKind.DECISION`; ellipse = TIMING_ONLY; purple outline = the two degraded cascade-tier nodes; clusters = the four `NodeFormat` lanes. Each node's label carries its `phase_ref` (the coarser pipeline-phase pointer) and its `GenAiTask` keys.
- **Edge kinds**: solid black + contract label = DATA_FLOW (`⚠ no wire-contract yet` where `contract_ref=None`); red dashed + open arrowhead = CONTROL_GATE; blue bold = CROSS_SERVICE.
- **Machine-readable annotations**: every node also carries custom DOT attributes `node_kind=`, `node_format=`, `telemetry_kind=`, `graph_tier=`, `mutation_kind=`, `role=`; every edge carries `edge_kind=`. Graphviz preserves unknown attributes, so the `.dot` file doubles as a structured export — you can re-derive any count in §1.2 from the file alone.

### 1.4 The bounded explainer subgraph (`R2-graph-subgraph-260922.dot`)

Selection was mechanical, not curated: *the CONTROL_GATE fan of the top gate producer, plus every non-CONTROL_GATE edge incident to that node set.* The top gate producer is **`pdf-document-signals-classifier`** with 13 outbound CONTROL_GATE edges (runner-up: `pdf-text-fidelity-gate` with 11 — together they account for all 24 CONTROL_GATE edges). Result: **16 nodes, 20 edges** (13 gates + 7 data-flow context edges). It reads at a glance: one ALGORITHMIC classifier node whose single decision gates a baker's dozen of downstream passes (dashed red fan), against which the few solid DATA_FLOW contracts stand out — the cleanest possible visual argument for "control flow is a separate relation."

### 1.5 BONUS facts for item #1

- **(1a) The model's own control caught its one gap, at this very commit.** `node_parity_drift()` (PDF, BLOCKING) returns `()` — 0 findings, full parity against the live `PdfPassRegistry`. `office_node_parity_drift()` (AUDIT-ONLY, rule #55) returns exactly **one finding: `missing_in_model: docx-heading-outline-derivation`** — the `DocxPassId.HeadingOutlineDerivation` member (`backend/src/AdaTool.Cli/Documents/DocxPassRegistration.cs:129`, slug mapping at `:176`, landed by heading-ir-first-title-derivation-260921 Phase 12) has no declared node yet. Both files are unchanged since `3baabd775d`, so this finding exists at the baseline too. So the honest census is **128 modeled of 129 live passes, with the 1-pass gap NAMED by the drift instrument rather than hidden** — for the chapter, this is a control catching real drift in the wild, at the exact commit being photographed.
- **(1b) The attribute ecology around the graph.** Nine `AttributeName` governance axes are registered (kind-config, complexity, cost, determinism-tolerance, accuracy, bounded-execution, latency, test-coverage, checker-trust), and the census in §4 shows the pattern in the model population itself: seven sibling provider models (`remediation_graph_{accuracy,bounded_execution,complexity,cost,latency,measured,tolerance}_provider.py`) each declare the hybrid form `REGISTRY (+BUDGET)` — the "#45 schema-stability" promise (a new attribute is one new file + one enum member, zero churn to the node record) is visible as a *file-population signature*. One node in the whole graph is off-driver (`pptx-media-subtitle-remediator`, reason `post-zip-close`), checked by its own dedicated escape-drift read.

---

## 2. Item #2 — The exact invariant corpus (all 86)

### 2.1 Source and derivation

The corpus is `system-models/state_machines.py` — the composed cross-service model: **7 `StateMachineSpec` + 4 `SeamConnector` + 86 `ConstraintBlock` + 4 `ProtocolTrace`** (`MODEL`; count re-verified by loading the module at extraction). The 86 invariants cite **14 distinct participant lanes** (census over the corpus: worker 47, server 25, job-introducer 15, job-completer 15, sweep-cron 7, dispatch 6, quota-gate 4, web 4, then six singleton lanes). Five of these are the declared SM-owner lanes (`M.participant_lanes()` = job-completer, job-introducer, quota-gate, server, worker); the rest (sweep-cron, dispatch, soa-services, admin-dashboard, …) are non-SM participants an invariant may still bind — the S-1 lint's participants-⊆-lanes subset check applies to `ProtocolTrace` records, not to invariant lanes.

The load-bearing property the reviewer asked to see: **the verification tier is derived, not hand-typed.** `derive_verification_tier` (`state_machines.py:520`) computes `(tier, hairy)` from three declared facts only:

- **H1**: ≥ 2 participant lanes touch the same coordination point;
- **H2**: the invariant names a race-shaped `CoordPrimitive` (anything but `NONE`);
- **temporal shape**: the `TemporalOperator` enum member (`[]P` safety vs `P~>Q` / `[]<>P` liveness) — the *same symbol that appears in the `.tla`*, replacing a deleted hand-typed `is_liveness` bool so "mislabeling requires writing the wrong operator, a visible + lint-checkable act."

HAIRY = H1 ∧ H2. HAIRY safety → `SAFETY_BFS` (exhaustive-BFS simworld mandatory); HAIRY liveness → `LIVENESS_TLC` (TLC/`.tla` mandatory); otherwise `LINEAR_PROPERTY` (property test mandatory). The stored field is asserted equal to the derivation by the rule-#57 lint (`tools/lint/lint-invariant-verification-tier.py`), so a hand-edit that lies is caught.

### 2.2 Extraction-time verification (all four checks clean)

1. **Re-derivation identity**: I re-ran `derive_verification_tier` over all 86 declared `(lanes, primitive, operator)` triples — **0 mismatches** against the stored `(verification_tier, hairy)` pairs. The derivation really is the source of truth.
2. **Checker existence**: all **103 `verify_refs` paths resolve to existing files** (83 distinct checker files) — 0 dangling.
3. **Checker totality**: **0 of 86 invariants lack a `verify_refs` leg** — every invariant names its checker.
4. **Runtime watch-point totality**: **86 of 86 carry ≥ 1 `satisfy_ref`** (150 total) — every invariant also names where it is satisfied/watched in production code.

### 2.3 Distributions

| Axis | Distribution |
|---|---|
| Derived tier | LINEAR_PROPERTY 64, SAFETY_BFS 20, LIVENESS_TLC 2 (= R1 exactly) |
| Coord primitive | NONE 62, SQL_CAS 12, ATOMIC_CLAIM 4, STALE_READ_HEARTBEAT 3, REDIS_READ_DELETE 1, INPROC_FLUSH_RACE 1, LUA_ATOMIC 1, LUA_MONOTONIC 1, DISPATCH_PENDING_JOIN 1 |
| Temporal operator | `[]P` 81, `P~>Q` 5, `[]<>P` 0 |
| Checker kind (over 103 refs) | PROPERTY 80, SIMWORLD 21, TLA_TLC 2 |

### 2.4 BONUS facts for item #2

- **(2a) The derivation is genuinely two-factor — both hairiness tests bind.** 24 invariants name a race-shaped primitive but only 22 are HAIRY: **`INV-C2-3`** (lane `worker`, `REDIS_READ_DELETE`) and **`INV-RC-5`** (lane `server`, `LUA_ATOMIC`) carry a race primitive on a *single* lane, so H1 fails and they correctly route to LINEAR_PROPERTY — a race primitive inside one lane is a sequential concern. Symmetrically, of the 5 liveness-shaped (`P~>Q`) invariants only 2 are HAIRY and escalate to TLC; `INV-C2-2`, `INV-BIND-2` (single-lane) and `INV-WP-S8-LIVENESS` (two lanes but `NONE` primitive) stay LINEAR. The tier table is not a lookup of any single column — it is a real join over three declared facts, which is precisely why "verification appropriate to the property" is representable rather than prose.
- **(2b) The 2 TLC rows carry their `.tla` property lines *in the model*.** `INV-18`: `LIVE_EventualTerminal == Submitted ~> Terminal`; `INV-FO-2`: `LIVE_FanoutTermination == WaitingWithMissingChunks ~> AllChunksTerminal`. `temporal_form_to_tla_property()` emits exactly these definition lines, and `tools/lint/lint-tla-property-matches-model.py` asserts the `.tla` file's declared property line equals the emission — the temporal formula cannot drift between model and spec.

### 2.5 The corpus (all 86 rows; generated from `R2-invariant-corpus-260922.csv`, which additionally carries `temporal_predicate`, `hairy`, and untruncated `full_description` columns)

| id | short description | participant lanes | coord primitive | temporal op | derived tier | checker kind(s) | checker path(s) | satisfy refs |
|---|---|---|---|---|---|---|---|---|
| INV-1 | Queue claim atomicity | job-introducer; worker | ATOMIC_CLAIM | []P | SAFETY_BFS | SIMWORLD; PROPERTY | web/test_simworld/test_inv1_atomic_claim.py::test_inv1_single_popper_no_loss_no_dup; web/test_dispatch_atomic_zpopmin_property.py | web/worker.py::_claim_and_process_chunk |
| INV-2 | Size-stratified fairness + tier ordering | job-introducer | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/test_simworld/test_inv2_fairness_ordering.py::test_inv2_classify_size_boundary_determinism | web/dispatch/queue.py::classify_size |
| INV-3 | Preemption-requeue priority preservation | job-introducer | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/test_simworld/test_inv3_preempt_requeue.py::test_inv3_preemption_preserves_page_count_and_size_class | web/job_completer.py::_reclaim_orphaned_leases |
| INV-4 | Cancellation removes from ALL 9 Redis structures + chunk purge. | server; job-introducer; worker | ATOMIC_CLAIM | []P | SAFETY_BFS | SIMWORLD; PROPERTY | web/test_simworld/test_inv4_cancel_all8.py::test_inv4_remove_from_all_8_clears_every_structure; web/test_dispatch_remove_from_all_queues_property.py | web/dispatch/queue.py::remove_from_all_queues |
| INV-6 | Metric/queue-depth consistency under queue-shape change | server | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/test_simworld/test_inv6_metric_queue_consistency.py::test_inv6_empty_all_structures_yields_zero | web/admin_dashboard.py::_live_queue_breakdown |
| INV-7 | Wake/sleep ↔ in-flight (split-brain + version gating) | job-introducer | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/test_simworld/test_inv7_version_gate_wakesleep.py::test_inv7_stale_pod_does_not_pop | web/job_introducer.py::introducer_tick |
| INV-8 | Stale-sweep ↔ heartbeat | job-completer; worker | STALE_READ_HEARTBEAT | []P | SAFETY_BFS | SIMWORLD | web/test_simworld/test_inv8_stale_sweep.py::test_inv8_sweep_spares_live_job_deterministic | web/job_completer.py::_reclaim_orphaned_leases |
| INV-9 | Progress monotonicity under concurrent writers | job-introducer | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/test_simworld/test_inv9_progress_monotonic.py::test_inv9_lua_monotonic_guard_present | shared/lua/progress_monotonic.lua |
| INV-10 | Chunk fan-out/fan-in aggregate | job-introducer; worker; job-completer | SQL_CAS | []P | SAFETY_BFS | SIMWORLD | web/test_simworld/test_inv10_chunk_fanin.py::test_inv10_single_completer_all_conjuncts | web/persistence/jobs.py::claim_coordinator |
| INV-11 | Cross-SOA partial-failure mid-sequence | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/test_simworld/test_inv11_xsoa_partial_failure.py::test_inv11_should_have_worked_raises_loud | web/worker.py::_build_partial_failure_record |
| INV-12 | Upload-before-DB-update on corrupt-output fallback | job-completer | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/test_simworld/test_inv12_recovery_ordering.py::test_inv12_finalize_output_precedes_update_job_with_fakedb | web/jobtypes/statemachine.py::RECOVERY_TRANSITIONS; web/chunking/recovery.py::run_fallback_merge_recovery |
| INV-13 | No-DROP under the bridge | server; quota-gate | ATOMIC_CLAIM | []P | SAFETY_BFS | SIMWORLD; PROPERTY | web/test_simworld/test_inv13_ack_after_terminal_model_check.py::test_inv13_ack_after_terminal_holds_no_drop; web/test_quota_gate_push_parity.py::test_redelivery_skips_reserve_and_completes | web/quota_gate.py::run_push_consumer |
| INV-14 | No-DOUBLE (credit) | server; quota-gate | SQL_CAS | []P | SAFETY_BFS | SIMWORLD; PROPERTY | web/test_simworld/test_inv14_quota_gate_cas_model_check.py::test_inv14_cas_holds_at_most_once_reserve; web/test_quota_gate_push_parity.py::test_concurrent_plus_redelivery_composed_exactly_one_reserves | web/persistence/jobs.py::claim_quota_gate |
| INV-15 | No-DOUBLE (chunk fan-out) | server; job-introducer | SQL_CAS | []P | SAFETY_BFS | SIMWORLD; PROPERTY | web/test_simworld/test_inv15_introducer_cas_model_check.py::test_inv15_cas_holds_at_most_once_fanout; web/test_introducer_claim_cas_dynamics.py::test_concurrent_plus_redelivery_composed_exactly_one_introduces | web/persistence/jobs.py::claim_introducer |
| INV-16 | Producer publishes STRAIGHT to the managed queue | server | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/dispatch/test_inv16_direct_publish_property.py::test_each_quota_gate_publish_lands_exactly_one | web/dispatch/seam.py::get_dispatch_seam |
| INV-17 | Orphan-recovery relocation preserves no-double-merge | job-completer; sweep-cron | SQL_CAS | []P | SAFETY_BFS | SIMWORLD | web/test_simworld/test_inv17_orphan_recovery_model_check.py::test_inv17_cas_holds_no_double_merge | web/persistence/jobs.py::claim_coordinator |
| INV-18 | Async-cutover eventual termination | job-completer; sweep-cron | STALE_READ_HEARTBEAT | P~>Q | LIVENESS_TLC | TLA_TLC | spec/INV18AsyncTermination.tla | web/job_completer.py::_recover_orphaned_jobs |
| INV-SCR-1 | GCP-timer-INDEPENDENT scale-to-zero resume | job-completer; sweep-cron | SQL_CAS | []P | SAFETY_BFS | SIMWORLD; SIMWORLD | web/test_simworld/test_scr_resume_model_check.py::test_scr_resume_completion_survives_all_push_failures; web/test_simworld/test_scr_resume_model_check.py::test_scr_resume_liveness_inflight | web/persistence/jobs.py::claim_quota_gate; web/job_completer.py::run_sweep |
| INV-FO-1 | Fan-out re-drive completeness — a WAITING parent NEVER has a permanently-absent chunk task: [](WAITING ⇒ ∀c: dispatched_durably(c) ∨ redrive_pending(c)). | job-introducer; sweep-cron | SQL_CAS | []P | SAFETY_BFS | SIMWORLD | web/test_simworld/test_invfo1_fanout_redrive.py::test_invfo1_redrive_completeness_holds | web/dispatch/managed_queue.py::publish_chunks_bulk; web/dispatch/fanout_redrive.py::redrive_incomplete_fanout; web/job_completer.py::_redrive_incomplete_fanout |
| INV-FO-2 | Fan-out eventual termination (INV-18 fan-out extension, G3) | job-introducer; sweep-cron | STALE_READ_HEARTBEAT | P~>Q | LIVENESS_TLC | TLA_TLC | spec/INVFO2FanoutTermination.tla | web/job_completer.py::_redrive_incomplete_fanout; web/dispatch/fanout_redrive.py::redrive_incomplete_fanout |
| INV-FR-1 | Frontier-state derivability | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/jobtypes/test_frontier_state_property.py::test_invfr1_derive_is_pure_total_and_matches_table | web/jobtypes/statemachine.py::derive_frontier_state |
| INV-FR-2 | Frontier immutability post-PLAN | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/jobtypes/test_frontier_state_property.py::test_invfr2_immutability_never_premature_finalizes | web/jobtypes/statemachine.py::derive_frontier_state |
| INV-FR-3 | PLAN claim atomicity + claim-once (Ph1b R1) | job-introducer; sweep-cron | SQL_CAS | []P | SAFETY_BFS | SIMWORLD | web/test_simworld/test_invfr3_frontier_plan.py::test_invfr3_atomic_cas_plan_never_violates | web/persistence/jobs.py::bulk_create_chunk_jobs; web/worker.py::_claim_and_process_chunk |
| INV-FR-4 | FINALIZE triple-fence single-execution | worker; sweep-cron | SQL_CAS | []P | SAFETY_BFS | SIMWORLD | web/test_simworld/test_invfr4_frontier_finalize.py::test_invfr4_merge_cas_never_double_finalizes | web/job_completer.py::_claim_merge_role |
| INV-P1 | DB-is-truth / Redis-is-derived | server; worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/persistence/test_jobs_doc_derived.py | web/persistence/jobs.py::update_job |
| INV-P2 | update_job compare-and-set guard | worker; job-completer | SQL_CAS | []P | SAFETY_BFS | SIMWORLD; PROPERTY | web/test_simworld/test_invp2_update_job_cas.py::test_invp2_cas_holds_at_most_one_winner_and_mirror_consistency; web/persistence/test_jobs_cas_property.py::test_should_mirror_iff_cas_won_or_unconditional | web/persistence/jobs.py::update_job |
| INV-P3 | Upload-before-DB-update on the corrupt-output fallback | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/chunking/test_recovery_doc_derived.py | web/jobtypes/statemachine.py::RECOVERY_TRANSITIONS |
| INV-P4 | Migration advisory-lock mutual exclusion | server; worker; job-introducer; quota-gate | ATOMIC_CLAIM | []P | SAFETY_BFS | SIMWORLD; PROPERTY | web/test_simworld/test_invp4_migration_lock.py::test_invp4_lock_holds_mutual_exclusion; web/test_db_migration_lock.py::test_resolve_direct_url_pgbouncer_falls_through_to_xact_mode | web/persistence/migrations.py::init_db |
| INV-P5 | Migration-block error isolation | server | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/persistence/test_seed_invariants_doc_derived.py | web/persistence/migrations.py::seed_required_rows; web/persistence/seed_invariants.py::assert_required_seed_rows |
| INV-P6 | Column-allowlist ↔ CAS interpolation soundness | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/persistence/test_columns_doc_derived.py | web/persistence/columns.py::_VALID_JOB_UPDATE_COLUMNS; web/persistence/jobs.py::update_job |
| INV-P7 | Schema-drift floor | server | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/persistence/test_columns_doc_derived.py | web/persistence/columns.py::_VALID_JOB_UPDATE_COLUMNS |
| INV-P8 | Connection dispatch soundness | server | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/test_db_migration_lock.py::test_resolve_direct_url_pgbouncer_falls_through_to_xact_mode | web/persistence/conn.py::_open_direct_postgres_conn; web/persistence/conn.py::_resolve_direct_database_url |
| INV-C2-1 | SOA-cost immediate-durability | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/dispatch/test_soa_cost_unit.py | web/dispatch/soa_cost.py::_accumulate_soa_cost |
| INV-C2-2 | Both-terminals cost flush | worker | NONE | P~>Q | LINEAR_PROPERTY | PROPERTY | web/costrollup/test_soa_flush_cov_unit.py | web/costrollup/soa_flush.py::flush_soa_cost_to_job_row |
| INV-C2-3 | Flush idempotency | worker | REDIS_READ_DELETE | []P | LINEAR_PROPERTY | PROPERTY | web/dispatch/test_soa_cost_unit.py | web/dispatch/soa_cost.py::_flush_soa_cost |
| INV-C2-4 | Exit-code fidelity — handle_cli_result maps every value in the closed CLI exit-code set to exactly one terminal, with no fall-through gap. | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/workerlifecycle/test_cli_result.py::TestHandleCliResultExitCodeTotalMapping | web/workerlifecycle/cli_result.py::handle_cli_result |
| INV-C2-5 | C#↔Python exit-code table consistency | worker; soa-services | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/wire_contracts/test_generated_cli_exit_codes.py | web/workerlifecycle/cli_result.py::handle_cli_result |
| INV-C2-6 | Chunk cost fan-in sums to parent | worker; job-completer | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/costrollup/test_persist_unit.py | web/costrollup/persist.py::persist_parent_cost_from_chunks |
| INV-19 | Atomic chunk-row creation (C5-a) | job-introducer | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/chunking/test_split_atomic_creation_property.py | web/persistence/jobs.py::bulk_create_chunk_jobs |
| INV-20 | Re-drivable chunk publish (C5-b) | job-introducer | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/chunking/test_pdf_chunk_boundaries_property.py | web/dispatch/queue.py::publish_chunks_bulk; web/dispatch/managed_queue.py::publish_chunks_bulk; web/dispatch/fanout_redrive.py::redrive_incomplete_fanout |
| INV-21 | Chunk purge on every cleanup path (C5-c) | server; job-completer | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/test_chunk_purge_property.py | web/lifecycle/job_lifecycle.py::purge_parent_chunks_from_redis |
| INV-22 | strip-attribution precedes finalize, never on failed jobs (C5-d) | job-completer | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/chunking/test_merge_finalize_completion_kwargs_seam.py | web/chunking/merge.py::_finalize_merge_output |
| INV-23 | Content-fidelity gate: input ⊆ output (C5-e, C5-f) | job-completer | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/chunking/test_merge_content_validation_failure_seam.py | web/chunking/merge.py::_run_merge_validation_gates |
| INV-24 | Per-pass fidelity marker surfaces + gates (C5-g) | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/test_genai_config_overrides.py | web/clisubprocess/markers.py::_PASS_FIDELITY_MARKER |
| INV-C5X-1 | PDF chunk-boundary tiling is a deterministic total closure (C5-EXTENSION split) | job-introducer | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/chunking/test_pdf_chunk_boundaries_property.py | web/chunking/split.py::compute_pdf_chunk_boundaries |
| INV-C5X-2 | Partial-completion COLUMN is source-of-truth; the envelope mirror is faithful (C5-EXTENSION finalize) | job-completer | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/chunking/test_partial_completion_property.py | web/chunking/finalize.py::_persist_partial_completion_count; web/chunking/finalize.py::_compute_partial_count_for_envelope |
| INV-C5X-3 | Chunk-eligibility decision is pure + hot-config-safe; downsample dispatch is decision-gated (C5-EXTENSION decision) | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/chunking/test_decision_doc_derived.py | web/chunking/decision.py::classify_chunk_eligibility; web/chunking/decision.py::_maybe_run_downsample |
| INV-C6-2 | Dynamic chunk-threshold probe is bounded + fail-safe (F1-fix contract) | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/test_pipeline_dynamic_chunk_threshold.py | web/clisubprocess/telemetry.py::get_dynamic_chunk_threshold; web/clisubprocess/__init__.py::get_dynamic_chunk_threshold |
| INV-C6-3 | CLI-subprocess argv-BUILD goes through the typed AdaToolInvoker chokepoint (rule #52 typed-invoker) | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/test_clisubprocess_command_p8_seam.py | web/clisubprocess/command.py::_build_cli_command; web/clisubprocess/command.py::_append_sm_prefs_flags |
| INV-C6-4 | CLI-subprocess drive-side observability + trace provenance | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/test_clisubprocess_runner_doc_derived.py | web/clisubprocess/runner.py::forward_cli_summary_lines; web/clisubprocess/runner.py::persist_trace_artifact |
| INV-OBS-1 | Fleet-concurrency display sourcing | admin-dashboard | NONE | []P | LINEAR_PROPERTY | PROPERTY | system-models/test_fleet_obs_invariants.py | web/persistence/analytics.py::AnalyticsRecord; web/persistence/analytics.py::get_analytics_summary; web/persistence/population_contract.py::genai_worker_fanout_cap; services/genai-service/aimd.py::AimdLimiter |
| INV-OBS-2 | Fleet-signal / state-view DECOUPLING + reconciliation bound (Q2 LINEAR modelling) | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | system-models/test_fleet_obs_invariants.py | services/genai-service/aimd.py::AimdLimiter; web/pipeline.py::JobStateMachine |
| INV-PS-1 | Credit debit-once CAS + consume⇒ledger fidelity (money conservation) | quota-gate; worker | SQL_CAS | []P | SAFETY_BFS | SIMWORLD; PROPERTY | web/test_simworld/test_invps1_credit_cas.py; web/persistence/test_billing_doc_derived.py | web/persistence/billing.py::consume_group_credits; web/persistence/billing.py::grant_group_credits |
| INV-PS-3 | Sidecar upsert idempotency (converge) | server; worker | NONE | []P | LINEAR_PROPERTY | PROPERTY; PROPERTY; PROPERTY; PROPERTY | web/persistence/test_cold_start_attribution_coverage.py; web/persistence/test_document_telemetry_coverage.py; web/persistence/test_users_doc_derived.py; web/persistence/test_config_overrides_doc_derived.py | web/persistence/cold_start_attribution.py::insert_cold_start_attribution_wake; web/persistence/document_telemetry.py::record_document_telemetry; web/persistence/users.py::upsert_user_oauth; web/persistence/config_overrides.py::set_config_override |
| INV-PS-4 | Analytics is DB-authoritative append (the store-split) | server; worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/persistence/test_analytics_doc_derived.py | web/persistence/analytics.py::record_analytics; web/persistence/analytics.py::record_daily_job; web/persistence/analytics.py::log_activity |
| INV-PS-5 | Persistence layer issues NO Redis cleanup (the layering invariant) | server | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/persistence/test_lifecycle_doc_derived.py | web/persistence/lifecycle.py::sweep_stale_active_jobs; web/persistence/lifecycle.py::expire_stale_queued_jobs; web/persistence/lifecycle.py::expire_stale_checking_jobs |
| INV-PS-6 | SQL-interpolation floor: every dynamic SQL fragment is enum/allowlist-bounded | server; worker | NONE | []P | LINEAR_PROPERTY | PROPERTY; PROPERTY | web/persistence/test_analytics_reporting.py; web/persistence/test_document_telemetry_coverage.py | web/persistence/analytics_reporting.py::_apply_source; web/persistence/document_telemetry.py::record_document_telemetry |
| INV-PS-7 | Read-model reads Postgres for authoritative counts | server | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/persistence/test_lifecycle_doc_derived.py | web/persistence/queue_status.py::count_by_status; web/persistence/queue_status.py::queue_depth; web/persistence/queue_status.py::get_active_processing_job_ids |
| INV-PS-8 | Sidecar rows carry typed ids (typed-id integrity) | server; worker | NONE | []P | LINEAR_PROPERTY | PROPERTY; PROPERTY; PROPERTY | web/persistence/test_users_doc_derived.py; web/persistence/test_debug_failures_corr_cause_columns.py; web/persistence/test__typed_ids_doc_derived.py | web/persistence/users.py::create_session; web/persistence/debug_failures.py::record_debug_failure |
| INV-AV-1 | ContentValidator verdict is fail-CLOSED (hard-gate decision purity) | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/test_outputcheck_validate_doc_derived.py | web/outputcheck/validate.py::_interpret_cli_validate_result; web/outputcheck/validate.py::run_content_validator |
| INV-AV-2 | The content-fidelity gate REACHES the canonical seam on every completing path (reach-completeness | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/chunking/test_merge_doc_derived.py | web/chunking/merge.py::_coordinate_merge; web/worker.py::_validate_chunk_output |
| INV-AV-3 | Output-integrity classification is fail-closed per format (corruption-gate purity) | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/test_outputcheck_validate_doc_derived.py | web/outputcheck/validate.py::_classify_integrity; web/outputcheck/validate.py::validate_output_integrity |
| INV-AV-4 | Advisory validation NEVER fails a job (the advisory-vs-hard-gate boundary) — no code path inside web/a11yvalidate/* transitions a job to FAILED. | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/a11yvalidate/test_batch_accumulator_doc_derived.py | web/a11yvalidate/validate.py::_run_a11y_validation; web/a11yvalidate/rendered_fidelity.py::_run_rendered_fidelity_check; tools/lint/lint-a11yvalidate-canonical.py::_check_advisory_rollup; web/a11yvalidate/render.py::_render_a11y_page_images |
| INV-AV-5 | Editor round-trip is a durable EditorRoundTripState lifecycle (IR_FETCHED → EDIT_APPLIED → RECHECKED → SAVED) with a canonical_hash SAVE-FENCE | server | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/test_routes_editor_doc_derived.py | web/api/routes_editor.py::_run_editor_save; web/outputcheck/doc_edit_service.py::canonical_hash; web/outputcheck/doc_edit_service.py::apply_editor_edit; web/outputcheck/doc_edit_service.py::read_editor_ir; web/outputcheck/editor_recheck.py::run_editor_recheck |
| INV-AV-6 | The A11yBatchAccumulator converges under concurrent judge callers (the HAIRY row → SAFETY_BFS). | judge_caller_a; judge_caller_b | INPROC_FLUSH_RACE | []P | SAFETY_BFS | SIMWORLD; PROPERTY | web/test_simworld/test_invav6_batch_flush_race.py::test_invav6_guards_hold_no_lost_entry_no_double_flush_no_lost_wakeup; web/a11yvalidate/test_batch_accumulator_doc_derived.py | web/a11yvalidate/batch.py::A11yBatchAccumulator; web/a11yvalidate/batch.py::_a11y_batch_flush_fn |
| INV-RC-1 | Metric-consistency: every total-depth queue metric reads ALL active queue structures FOR ITS SCOPE (the arch-rule, encoded) | server; worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/dispatch/test_metrics_reconcile_characterization.py | web/dispatch/queue.py::queue_depth; web/dispatch/schema.py::SizeStratifiedJobQueues |
| INV-RC-2 | Schema is the sole raw-Redis key registry (the boundary invariant) | dispatch; worker; server | NONE | []P | LINEAR_PROPERTY | PROPERTY | tools/lint/lint-web-dispatch-boundary.py | web/dispatch/schema.py; web/dispatch/__init__.py; web/dispatch/_typed_ids.py::RedisKey |
| INV-RC-3 | 'Redis for communication, DB for truth' | worker; job-completer; server | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/dispatch/test_metrics_doc_derived.py | web/dispatch/metrics.py::set_parent_progress; web/dispatch/metrics.py::clear_job_progress; web/dispatch/schema.py::JobProgress |
| INV-RC-4 | Cancellation removes a job from ALL queue structures (the completeness invariant) | server; worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/dispatch/test_remove_from_all_queues_characterization.py | web/dispatch/queue.py::remove_from_all_queues; web/dispatch/schema.py::SizeStratifiedJobQueues; web/dispatch/schema.py::InFlightLease |
| INV-RC-5 | Chunk creation is bulk-atomic; chunk publish is re-drivable to completeness | server | LUA_ATOMIC | []P | LINEAR_PROPERTY | PROPERTY | web/chunking/test_pdf_chunk_boundaries_property.py | web/dispatch/queue.py::publish_chunks_bulk; shared/lua/publish_chunks_bulk_lua.lua; web/dispatch/managed_queue.py::publish_chunks_bulk; web/dispatch/fanout_redrive.py::redrive_incomplete_fanout |
| INV-RC-6 | Progress writes are Lua-atomic monotonic (percent never regresses under concurrent chunk-worker aggregation) | worker; chunk-worker | LUA_MONOTONIC | []P | SAFETY_BFS | SIMWORLD; PROPERTY | web/test_simworld/test_invrc6_progress_cas.py; web/dispatch/test_metrics_reconcile_characterization.py | web/dispatch/metrics.py::set_parent_progress; web/dispatch/metrics.py::aggregate_parent_from_chunks; web/dispatch/metrics.py::_normalize_stage |
| INV-RC-7 | 'processing' is DERIVED from llen(PROCESSING_KEY), never a rival counter | server; worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | tools/lint/lint-no-raw-processing-counter.py | web/dispatch/queue.py::processing_count; web/dispatch/queue.py::ack_job; web/dispatch/schema.py::Metrics |
| INV-RC-8 | Redis keys carry typed ids (typed-id integrity) | dispatch | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/dispatch/test__typed_ids_doc_derived.py | web/dispatch/_typed_ids.py::RedisKey; web/dispatch/schema.py::JobMeta; web/dispatch/schema.py::JobProgress |
| INV-COST-1 | Parent-rollup cost conservation | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/test_chunked_parent_analytics_rollup.py | web/costrollup/__init__.py::persist_parent_cost_from_chunks; web/costrollup/__init__.py::aggregate_chunk_token_usage |
| INV-COST-2 | Per-model spend conservation (SPEND-6) — for any job, SUM(job_model_costs.cost_usd) EQUALS jobs.cost_usd. | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/costrollup/test_persist_unit.py | web/costrollup/__init__.py::persist_job_cost_usd |
| INV-COST-3 | SpendReader never-false-zero (SPEND-3) | web | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/test_spend_reader_unit.py | web/spend_reader.py::SpendReader; web/_spend_types.py::SpendSource |
| INV-COST-4 | Debit-once (NEW-GAP-4) — convert_reservation_to_debit debits a job's reservation AT MOST ONCE across concurrent + redelivered deliveries. | web; worker | SQL_CAS | []P | SAFETY_BFS | SIMWORLD | web/test_simworld/test_money_path_model_check.py | web/billing/ledger.py::convert_reservation_to_debit; web/jobtypes/enums.py::JobStatus |
| INV-COST-5 | Cancel-once terminal-consistency (NEW-GAP-3) | web; worker | SQL_CAS | []P | SAFETY_BFS | SIMWORLD | web/test_simworld/test_p1_cancel_fail_model_check.py | web/lifecycle/job_lifecycle.py::JobLifecycle |
| INV-COST-6 | Credit-grant equalization | web | NONE | []P | LINEAR_PROPERTY | PROPERTY | web/test_commercialization_disabled_new_account_has_credits.py | web/persistence/credit_constants.py::ANON_GRANT_CREDITS; web/persistence/credit_constants.py::SIGNUP_FREE_CREDITS; web/persistence/pricing.py::compute_price |
| INV-BIND-1 | Binding env/brief-completeness | dispatch | NONE | []P | LINEAR_PROPERTY | PROPERTY | tools/agents/test_binding_from_brief.py::test_binding_fires_from_brief_when_env_absent | tools/agents/sentinel_first_commit.py::run_sentinel |
| INV-BIND-2 | Binding liveness | dispatch | NONE | P~>Q | LINEAR_PROPERTY | PROPERTY | tools/agents/test_binding_from_brief.py::test_binding_fires_from_brief_when_env_absent | tools/agents/agent_registry.py::update_harness_id |
| INV-BIND-3 | Binding uniqueness/no-mis-join | dispatch; dispatch-b | DISPATCH_PENDING_JOIN | []P | SAFETY_BFS | SIMWORLD | web/test_simworld/test_invbind3_dispatch_mis_join.py::test_invbind3_brief_parse_never_mis_joins | tools/agents/_agent_identity.py::parse_dispatch_id_from_brief |
| INV-BIND-4 | Marker↔registry consistency — once bound, the active-agents marker key and the registry row's canonical key resolve to the SAME agent (J2/J5 no longer mis-key). | dispatch | NONE | []P | LINEAR_PROPERTY | PROPERTY | tools/agents/test_binding_from_brief.py::test_env_dispatch_id_still_takes_precedence | tools/agents/agent_registry.py::reconcile_markers |
| INV-WP-S8-CAUSAL | S8 fan-in measurement causality — for every job jobs.completer_claimed_at >= jobs.chunk_notified_at (S8 >= 0). | worker; job-completer | NONE | []P | LINEAR_PROPERTY | PROPERTY | tools/perf/test_warm_path_s8_measurement_invariants.py::test_causal_negative_s8_flagged_untrustworthy | tools/perf/warm_path_critical_path.py::_measurement_integrity |
| INV-WP-S8-LASTCHUNK | S8 fan-in start stamp reflects the LAST chunk — jobs.chunk_notified_at holds the fan-in-complete instant, not a racing earlier chunk. | worker | NONE | []P | LINEAR_PROPERTY | PROPERTY | tools/perf/test_warm_path_s8_measurement_invariants.py::test_lastchunk_last_committer_writes_max_by_construction | web/worker.py::_notify_coordinator_and_check |
| INV-WP-S8-LIVENESS | S8 fan-in measurement completeness | worker; job-completer | NONE | P~>Q | LINEAR_PROPERTY | PROPERTY | tools/perf/test_warm_path_s8_measurement_invariants.py::test_liveness_null_s8_on_completed_job_flagged | tools/perf/warm_path_critical_path.py::_measurement_integrity |

---

## 3. Item #3 — The authoritative chunk lifecycle, mechanically exported

### 3.1 Source and method

The authoritative table is `web/jobtypes/statemachine.py`: `ChunkState` (`:167`), `CHUNK_TRANSITIONS` (`:211`), `CHUNK_TERMINAL_STATES` (`:240`). The exports (`R2-lifecycle-260922.dot`, `R2-lifecycle-260922.mmd`) were emitted by a script that **iterates the imported Python dict** — every state node and every transition edge in both files is a mechanical enumeration of the live table; nothing was redrawn by hand. Counts: **10 states, 19 legal transitions, 6 terminal-safe states.**

This table is *enforced*, not advisory: `JobStateMachine.transition` raises `ValueError` on any pair not in the dict (`:624-630`), and the production constructors at `web/worker.py:2537` and `:3033` pass exactly these tables. The model layer (`state_machines.py` `_SM_CHUNK`) looks the same symbols up rather than copying them (rule #42) — so the figure, the runtime, and the composed model share one source.

### 3.2 Terminal-state distinctions (preserved in both renderings)

`CHUNK_TERMINAL_STATES` = {IDLE, COMPLETING, FAILED, REQUEUING, CANCELLING, BATON_HANDOFF}. Note the semantics: *terminal-safe* means "a safe place for the machine to come to rest" (the required `terminal_states` constructor argument feeding `ensure_terminal()` force-fail semantics), not "graph sink" — COMPLETING, FAILED, REQUEUING, CANCELLING and BATON_HANDOFF all still transition onward (to IDLE, or CANCELLING→COMPLETING for non-skippable cleanup). The renderings color the distinction three ways: **green success terminals** COMPLETING and BATON_HANDOFF, **red failure** FAILED, neutral terminal-safe IDLE / REQUEUING / CANCELLING; double-ring (DOT) / thick-stroke (Mermaid) marks the terminal-safe set; IDLE carries the initial-state entry arrow.

### 3.3 The annotated FORBIDDEN edges (the absent-edge semantics)

Three deliberately absent edges are drawn in the DOT as red dashed tee-headed `constraint=false` edges (and carried as notes in the Mermaid), each cited to its invariant:

1. **PROCESSING ⇏ BATON_HANDOFF** — INV-BAT-4 (durable-before-terminal): the baton terminal is reachable *only* from UPLOADING, so a baton cannot be recorded before the partial result is durably uploaded. The guard is the *shape of the transition table itself*, not a runtime check that could be skipped.
2. **FAILED ⇏ BATON_HANDOFF** — INV-BAT-7: a failure can never masquerade as a banked milestone; BATON is reachable only from a successful durable commit.
3. **FAILED ⇏ REQUEUING** — the repo-wide no-failure-requeue doctrine (`lint-no-failure-requeue.py`): `FAILED → {IDLE}` only; the sole sanctioned automatic requeue is the autoscaler-preemption path PROCESSING → REQUEUING.

These three are the book figure's punchline: in this codebase, an invariant can be encoded as an edge that *does not exist*, and the source comments at `statemachine.py:211-239` document the absence explicitly — the model names its negative space.

### 3.4 BONUS facts for item #3

- **(3a) The parent lifecycle, same exporter** (`R2-lifecycle-parent-260922.dot` / `.mmd`): `ParentJobState` + `PARENT_TRANSITIONS` + `PARENT_TERMINAL_STATES` — **10 states, 17 transitions, 4 terminal-safe** — emitted by the identical mechanical path, so the two figures are guaranteed stylistically and methodologically uniform.
- **(3b) The module is a family, and the composed model consumes most of it.** `web/jobtypes/statemachine.py` hosts **8 transition tables** (QuotaGate, Chunk, Parent, Recovery, Upload, Scaler, CliSubproc, and the built `JOBS_STATUS_TRANSITIONS`) plus the `FrontierState` enum; **7 register as composed-model lanes** in `state_machines.py` (`quota-gate`, `upload`, `parent`, `chunk`, `recovery`, `durable-job-record` ← `JOBS_STATUS_TRANSITIONS`, `cli-subprocess`). The `ScalerState` table exists and is runtime-enforced but is not (yet) a composed-model lane — an honest as-built asymmetry worth a footnote if the figure claims "all SMs are composed."

---

## 4. Item #6 — The model census (all 130 records)

### 4.1 Method and the 129-vs-130 reconciliation (sharpens R1)

The census enumerates every file under `system-models/` declaring `MODEL_FORM` at commit `3baabd775d` (set-identical at HEAD): **130 files**. `MODEL_KIND` / `MODEL_FORM` / `MODEL_FORM_SECONDARY` were AST-parsed from each file; `short purpose` is the first sentence of the module docstring; `primary consumer(s)` is a **mechanical importer scan** (git grep for `import <stem>` / `from <stem> import`, falling back to quoted-stem references for string-loaded modules; top 3 shown, prioritized lints > tools > web > deploy > sibling models, tests deprioritized) — a proxy, labeled as such, not a hand-curated claim. 34 of the 130 rows have **no direct importer** and are marked "(no direct importer found; loaded generically by the repo-query model walker)": the repo-query loader walks `system-models/*.py` and loads every model dynamically, so a model consumed only through the generic query surface leaves no import statement to find — an honest limit of the mechanical scan, not evidence the model is dead.

**Reconciliation.** R1 counted "130 model files declare a `MODEL_FORM`" by grep; `repo-query models forms` reports a census of **129**. Both are correct with different denominators: `system-models/test_repo_query_invariant_coverage.py` contains the token because it *assigns* `m.MODEL_FORM = form_tag` dynamically to synthetic fixture modules (`:182`) — it is a test of the census machinery, not a model record, and the repo-query loader rightly excludes it. The honest statement for the chapter: **129 loaded model records; 130 files carry the declaration token.** The census table below includes all 130 rows with a `loaded_by_repo_query` column making the one exclusion explicit.

### 4.2 Distributions (over the 129 loaded records; matches R1's aggregate exactly)

| MODEL_FORM | n | | MODEL_KIND | n |
|---|---|---|---|---|
| REGISTRY | 50 | | PRODUCT | 77 |
| INSTRUMENT | 17 | | AGENT_META | 51 |
| BUDGET | 12 | | ENVIRONMENT | 1 |
| SCHEMA | 11 | | | |
| CONSTRAINT_SET | 10 | | | |
| DATAFLOW | 8 | | | |
| TOPOLOGY | 7 | | | |
| STATE_MACHINE | 4 | | | |
| POLICY | 4 | | | |
| DECISION_TABLE | 4 | | | |
| INTERACTION | 2 | | | |

### 4.3 BONUS facts for item #6

- **(6a) Hybrid forms are a real, patterned sub-population.** 11 loaded models declare `MODEL_FORM_SECONDARY`: the three lifecycle models (`agent_orch`, `deploy_promote_lifecycle`, `merge_train_lifecycle`) and the composed `state_machines` are `STATE_MACHINE (+CONSTRAINT_SET)` — a state machine that *carries its own invariants* is the house idiom, four for four; and the seven `remediation_graph_*_provider` files are `REGISTRY (+BUDGET)` — the attribute-provider genre of §1.5(1b), visible as a census signature. (13 files grep-match `MODEL_FORM_SECONDARY`; the other two are `_typed_primitives.py`, which *defines* the field, and `repo-query.py`, which reads it.)
- **(6b) The `ENVIRONMENT` kind has exactly one member**: `system-models/cloud_service_provider.py` — the singleton model of the cloud substrate the product runs on, a nice concrete anchor for the KIND axis (product models describe the shipped thing, agent-meta models describe the factory, and exactly one model describes the ground it all stands on).

### 4.4 The census (all 130 rows; generated from `R2-model-census-260922.csv`)

| path | MODEL_KIND | MODEL_FORM | short purpose | primary consumer(s) (importer scan, top 3) |
|---|---|---|---|---|
| system-models/agent_orch.py | AGENT_META | STATE_MACHINE (+CONSTRAINT_SET) | Typed Layer-3 SSOT for the composed agent-orchestration state-machine model. | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/agent_substrate_layering.py | AGENT_META | CONSTRAINT_SET | Typed layer-boundary contracts for the agent-substrate. | tools/lint/lint-agent-substrate-layering.py; tools/agents/test_lander_cut_m2.py; system-models/test__agent_substrate_layering_doc_derived.py |
| system-models/anomaly_detectors.py | PRODUCT | REGISTRY | The anomaly-detector registry — the canned analysis per ``AnomalyKind`` (Phase-4 impl). | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/audio_render_rss_sizing_model.py | PRODUCT | BUDGET | ``audio_render_rss_sizing_model`` — the peak-RSS prediction that sizes ``audio-render-service``. | tools/lint/lint-invariant-verification-tier.py; tools/lint/lint-model-declares-scaling-metric.py; tools/lint/test_lint_invariant_verification_tier.py |
| system-models/batch_execution_model.py | PRODUCT | BUDGET | Layer-3 model for GenAI batch-execution cost/latency — ``batch_size`` as a tunable term. | system-models/remediation_cost_budget.py |
| system-models/boundary_kinds.py | AGENT_META | REGISTRY | Boundary-kind classification helpers for Component path resolution. | tools/lint/_layer_router.py; tools/lint/lint-boundary-kind-classified.py; tools/lint/lint-primitives-density-ts.py |
| system-models/c4_container.py | PRODUCT | TOPOLOGY | C4 Context + Container view — a DERIVED, customer-facing system-at-a-glance projection. | system-models/diagram_model.py |
| system-models/calibration_cell.py | PRODUCT | SCHEMA | Shared calibration-cell provenance carrier for the cost-function model family. | tools/lint/lint-model-declares-scaling-metric.py; system-models/audio_render_rss_sizing_model.py; system-models/batch_execution_model.py |
| system-models/canonical_read_surfaces.py | PRODUCT | REGISTRY | Canonical access surfaces — READ-side meta-file sibling to state_mutator_registry. | tools/lint/lint-canonical-read-surfaces-integrity.py; tools/lint/lint-meta-file-cross-refs-with-tiers-blocking.py; tools/lint/lint-redis-mediation.py |
| system-models/census_collection_exempt.py | AGENT_META | REGISTRY | Registry: test-shaped files pytest legitimately does NOT collect (census EXEMPT). | tools/lint/lint-test-collection-census.py |
| system-models/chunkless_concurrency_sizing_model.py | PRODUCT | BUDGET | ``chunkless_concurrency_sizing_model`` — the dial-stack sizing SoT for the chunkless baton. | tools/lint/lint-invariant-verification-tier.py; tools/lint/lint-model-declares-scaling-metric.py; tools/lint/test_lint_invariant_verification_tier.py |
| system-models/chunkless_critical_path_model.py | PRODUCT | BUDGET | Layer-4 model: the CALL-LEVEL critical-path / expected-cost function over the remediation IR-dependency graph | tools/lint/lint-invariant-verification-tier.py; tools/lint/lint-model-declares-scaling-metric.py; tools/lint/test_lint_invariant_verification_tier.py |
| system-models/chunkless_distribution_model.py | PRODUCT | DATAFLOW | Layer-3 system-model: the CHUNKLESS-DISTRIBUTION paradigm | tools/lint/lint-invariant-verification-tier.py; system-models/test_chunkless_distribution_model.py; system-models/test_edit_application_ordering_model.py |
| system-models/chunkless_time_complexity_model.py | PRODUCT | BUDGET | ``chunkless_time_complexity_model`` — the round-multiplication TIME envelope of one chunkless job. | system-models/test_chunkless_time_complexity_model.py |
| system-models/claude_md_rules.py | AGENT_META | REGISTRY | Registry of CLAUDE.md numbered-rule metadata, extracted from inline ``<!-- rule-meta: -->`` blocks. | tools/lint/lint-claude-md-rule-meta-conformance.py; tools/lint/lint-claude-md-rule-meta-coverage.py; tools/agents/test_cron_alerts_bulk_ack.py |
| system-models/cli_output_contracts.py | PRODUCT | SCHEMA | Per-subcommand expected-JSON-output contracts for the external-CLI seams. | web/a11yvalidate/test_render_canvas_dims.py; web/test_fuzz_external_cli_parse.py; system-models/test_cli_output_contracts.py |
| system-models/cli_parity.py | PRODUCT | CONSTRAINT_SET | INV-CLI-PARITY — the pure-Python deployment invariant (Layer 3 meta-file). | system-models/components.py |
| system-models/cloud_cost_allocation.py | PRODUCT | BUDGET | Layer-3 SSOT for the settled-day per-job CLOUD-cost ALLOCATION (Epic gcp-cost-wave4b-real-data-confirm-260706, Phase 3 | tools/lint/lint-invariant-verification-tier.py |
| system-models/cloud_service_provider.py | ENVIRONMENT | CONSTRAINT_SET | Typed SSOT for CLOUD-PROVIDER CONSTRAINT FACTS — the limits we do NOT control. | system-models/test_cloud_service_provider.py |
| system-models/code_categories.py | AGENT_META | REGISTRY | Per-category (leaf / group / meta / unknown) code classification. | tools/lint/lint-all.py; tools/dev/coverage-per-module.py; tools/lint/test_lint_all_per_category.py |
| system-models/cold_start_attribution.py | PRODUCT | REGISTRY | Shared QUALITATIVE cold-start attribution model — one level beneath ``cold_ms``. | tools/perf/coldstart_critical_path.py |
| system-models/cold_start_distributions.py | PRODUCT | SCHEMA | Typed reader/writer for the measured cold-start distribution SINK (the history). | tools/perf/coldstart_critical_path.py |
| system-models/complexity_assurance.py | AGENT_META | REGISTRY | Per-format complexity-assurance registry — the typed CLAIMS surface (G2/NS2). | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/components.py | PRODUCT | TOPOLOGY | Canonical system-component catalogue for ADAtool. | tools/lint/_component_file_scoping.py; tools/lint/_component_tags_parser.py; tools/lint/_layer_router.py |
| system-models/control_family.py | AGENT_META | REGISTRY | Typed ``ControlFamily`` meta-registry — the code→control anchor sources. | system-models/missing_control_metric.py |
| system-models/cost_model.py | PRODUCT | REGISTRY | Cost-model vocabulary: algorithmic complexity vs concrete constants. | tools/lint/lint-complexity-assurance-completeness.py; tools/lint/lint-model-declares-scaling-metric.py; tools/chunkless/derive_growth_confirmation.py |
| system-models/coverage_ref.py | AGENT_META | SCHEMA | DDT++ enabler — map test coverage onto the state-machine model's nodes. | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/cron_entries.py | AGENT_META | REGISTRY | Source-of-truth registry for periodic GC cron entries (NOT the per-minute merge-train). | system-models/test__cron_entries_doc_derived.py |
| system-models/csharp_product_invariants.py | PRODUCT | CONSTRAINT_SET | C#-product-invariant UMBRELLA MODEL — a PROJECTION of the C# registry SoT. | tools/lint/lint-invariant-verification-tier.py; system-models/test_trace_query.py |
| system-models/data_flow.py | PRODUCT | DATAFLOW | Compliance-grade data-flow model (DFD) — the typed sink + edge registry. | system-models/c4_container.py |
| system-models/deploy_promote_lifecycle.py | AGENT_META | STATE_MACHINE (+CONSTRAINT_SET) | Typed Layer-3 model of the Cloud Run fleet-promote lifecycle (deploy substrate). | deploy/cloud-run/deploy_cloudrun.py; deploy/cloud-run/test_serverless_deploy_driver.py; system-models/test_deploy_promote_lifecycle.py |
| system-models/deployment_topology.py | PRODUCT | TOPOLOGY | Typed Layer-3 loader for the managed-deployment topology. | tools/lint/lint-c4-container-drift.py; tools/lint/lint-deployment-topology-total-and-disjoint.py; tools/lint/lint-every-service-has-smoke-probe.py |
| system-models/diagram_model.py | AGENT_META | SCHEMA | Target-agnostic intermediate diagram graph + the model→graph projections. | system-models/diagram_render.py |
| system-models/diagram_render.py | AGENT_META | INSTRUMENT | The graph→text half of the generated model-viz pipeline — pluggable targets. | system-models/repo-query.py |
| system-models/doc_lints_by_tier.py | AGENT_META | REGISTRY | Registry: SYNTAX-tier doc lints eligible to run at precommit intermediate commits. | .githooks/pre_commit_lib.py |
| system-models/docker_codegen.py | AGENT_META | REGISTRY | Canonical Dockerfile-codegen substrate types + lookup tables. | tools/lint/lint-dotnet-publish-machine-type.py; tools/lint/lint-runtime-image-drops-shelled-tools.py; tools/build/_gen_cloudbuild_emit.py |
| system-models/document_fact_catalogue.py | PRODUCT | REGISTRY | Document Fact Catalogue (DFC) | system-models/chunkless_critical_path_model.py; system-models/ir_registry.py |
| system-models/edit_application_ordering_model.py | PRODUCT | CONSTRAINT_SET | Layer-3 system-model: the EDIT-APPLICATION-ORDERING oracle — the executable complement of the prose model ``docs/design/patch-application-ordering-model-260830.md``. | tools/lint/lint-invariant-verification-tier.py; system-models/test_edit_application_ordering_model.py |
| system-models/entitlement_model.py | PRODUCT | DECISION_TABLE | Layer-3 SSOT for the ADATool **entitlement / admit** decision — "can this user upload N pages of this format?". | system-models/components.py |
| system-models/environment_model.py | PRODUCT | TOPOLOGY | The typed ENVIRONMENT MODEL — per-deployment behavioral-fork inventory + staging-fidelity coverage. | system-models/repo-query.py |
| system-models/error_path_coverage.py | AGENT_META | REGISTRY | Registry: fleet ErrorPath → failure-injection test that drives BOTH destinations. | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/external_seams.py | AGENT_META | REGISTRY | External-seam classification helpers for Component path resolution. | tools/lint/lint-banned-apis.py; tools/lint/lint-env-access.py; tools/lint/lint-external-seams-consumer-fresh.py |
| system-models/fanout_execution_model.py | PRODUCT | CONSTRAINT_SET | Contract/shape model for the bounded-concurrency ORDERED-RESULT fan-out executor (rule #57). | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/feature_gates.py | PRODUCT | REGISTRY | Typed registry + lifecycle for the validated-feature-promotion discipline. | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/fidelity_tier.py | PRODUCT | REGISTRY | The ``FidelityTier`` vocabulary — the models-bridge home of the harness tiers. | system-models/role_instantiations.py; web/testing/_fidelity.py |
| system-models/finance_pricing_model.py | PRODUCT | BUDGET | Layer-3 SSOT for the ADATool unit-economics / cost-volume-profit (CVP) model. | web/_daily_cost_board.py; web/_per_file_cost.py; web/admin_dashboard.py |
| system-models/frontend_build_model.py | AGENT_META | TOPOLOGY | Typed single-source-of-truth for the frontend build model. | tools/lint/lint-banned-apis.py; tools/lint/lint-frontend-entrypoint-bundled.py; tools/lint/lint-no-bare-hex-literals.py |
| system-models/frontend_flow.py | PRODUCT | DATAFLOW | Frontend-flow model for ADATool's five frontend trees. | tools/lint/lint-meta-file-cross-refs-with-tiers-blocking.py; tools/lint/lint-service-flow-model.py; system-models/repo-query.py |
| system-models/fuzz_targets.py | AGENT_META | REGISTRY | The model-derived fuzz-target census — fuzz coverage as a queryable model property. | tools/lint/lint-fuzz-target-coverage.py; tools/lint/test_lint_fuzz_target_coverage.py |
| system-models/genai_first_policy.py | PRODUCT | POLICY | GenAI-First-Policy MODEL — a typed NAMING of the fail-fast / cost-tier-cascade degradation-decision policy; a curated read-only PROJECTION, NOT a runtime authority. | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/genai_invocation_contract.py | PRODUCT | DECISION_TABLE | GenAI-Invocation-Contract MODEL — a PROJECTION of the C# TaskContract SoT. | system-models/genai_first_policy.py; system-models/test_genai_first_policy.py |
| system-models/governance_control_firing_ledger.py | AGENT_META | INSTRUMENT | Tier-1 control-EXERCISE mining — a DERIVED, READ-ONLY projection (Phase 2). | system-models/repo-query.py |
| system-models/governance_conversion_ledger.py | AGENT_META | INSTRUMENT | The governance-conversion causal ledger — a DERIVED PROJECTION, not a 5th store. | system-models/repo-query.py |
| system-models/governance_glue_classes.py | AGENT_META | REGISTRY | The shared, CLOSED named-class glue registry for BOTH governance coverage metrics. | system-models/missing_control_metric.py |
| system-models/governance_graph.py | AGENT_META | INTERACTION | Typed Layer-3 SSOT for the PROCESS-governance Governance Graph (L-orch canary). | system-models/control_family.py; system-models/repo-query.py; docs/epics/closed/missing-control-metric-260725/pilot-artifacts/trace_controls.py |
| system-models/image_fidelity_model.py | PRODUCT | DATAFLOW | Image-fidelity / downsample MODEL | system-models/test_repo_query_invariant_coverage.py |
| system-models/interservice_edges.py | PRODUCT | TOPOLOGY | The InterServiceCall contract model — the typed sync-edge SoT (Phase 2). | tools/lint/lint-render-purpose-parity.py |
| system-models/invariant_surfaces.py | AGENT_META | REGISTRY | The invariant-surface opt-out meta-registry + the R-1 family-ratchet (P:F9). | tools/lint/lint-bespoke-family-collision.py; tools/lint/lint-bespoke-invariant-declared.py; system-models/repo-query.py |
| system-models/ir_registry.py | PRODUCT | REGISTRY | IR registry — the alignment-control meta-file (CLAUDE.md rule #33). | tools/lint/lint-ir-has-consumer.py; tools/lint/test_lint_ir_has_consumer.py |
| system-models/journey_criticality.py | PRODUCT | REGISTRY | The typed journey-criticality model — MAJOR/MINOR journeys/parts → derived test-tier. | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/kcoverage_activation.py | AGENT_META | INSTRUMENT | The k-coverage ACTIVATION-CONDITION AUDIT — W0 of ``telemetry-kcoverage-corpus-260916`` Phase 5 (``phase-5-coverage-lift-260916.md`` §T + §3 wave table). | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/kcoverage_exercise_harness.py | AGENT_META | INSTRUMENT | The k-coverage EXERCISE-MEASUREMENT harness | system-models/kcoverage_setcover.py |
| system-models/kcoverage_setcover.py | AGENT_META | INSTRUMENT | The k-coverage SET-COVER SELECTOR — Phase 3 of telemetry-kcoverage-corpus-260916 (design ``phase-1-260916.md`` §D.2 + ``phase-1b-review-260916.md`` §G-1/§G-2 rulings). | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/lightweight_precommit_candidates.py | AGENT_META | REGISTRY | Canonical registry of LIGHTWEIGHT-tier lint candidates. | .githooks/pre_commit_lib.py |
| system-models/lock_classes.py | AGENT_META | REGISTRY | Canonical lock-class registry for the dev-machine OS-lock substrate. | tools/lint/lint-lock-ordering-reentry.py; tools/lint/test_lint_lock_ordering_reentry.py |
| system-models/media_separation_dataflow.py | PRODUCT | DATAFLOW | MediaSeparationDataflow — a read-only INERT PROJECTION that NAMES the data flow at the media-separation point and ASSERTS a constant memory ceiling on it. | system-models/test_repo_query_invariant_coverage.py |
| system-models/mediators.py | AGENT_META | REGISTRY | Canonical mediator registry for dev-time subprocess serialization. | tools/lint/lint-mediator-lookup-should-use-substrate.py; tools/lint/test_lint_component_import_boundaries.py; tools/lint/test_lint_mediator_lookup_should_use_substrate.py |
| system-models/merge_train_lifecycle.py | AGENT_META | STATE_MACHINE (+CONSTRAINT_SET) | Typed Layer-3 model of the merge-train ``run`` (default-landing) lifecycle. | tools/agents/_merge_train/_run_state.py; tools/agents/_merge_train/test_run_state_parity.py; system-models/test_merge_train_lifecycle.py |
| system-models/metric_ref.py | AGENT_META | SCHEMA | Metric-provenance enabler — a quality-bearing model element DECLARES its validation metric + typed pointers to the test + fixture that measure it. | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/metric_validation_harness.py | AGENT_META | INSTRUMENT | OFFLINE metric-validation harness (MV-1…MV-7) for the ``struct-tree`` / ``group-partition`` determinism metric | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/missing_control_metric.py | AGENT_META | INSTRUMENT | The Missing-CONTROL-Metric — the governance-side dual of MMM, PRODUCTION tool. | system-models/governance_conversion_ledger.py; system-models/repo-query.py; docs/epics/closed/missing-control-metric-260725/pilot-artifacts/trace_controls.py |
| system-models/model_decision_telemetry_coverage.py | AGENT_META | INSTRUMENT | Kind-aware decision/transform TELEMETRY coverage | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/model_invariant.py | AGENT_META | SCHEMA | The shared DECLARED-tier model-invariant record + tier→kind map (rule #57). | system-models/audio_render_rss_sizing_model.py; system-models/batch_execution_model.py; system-models/calibration_cell.py |
| system-models/model_link_contract.py | AGENT_META | CONSTRAINT_SET | The typed MODEL-LINK CONTRACT — strong-links-by-default + declare-to-weaken + minimal floor. | system-models/telemetry_collection.py |
| system-models/model_selection_probe.py | PRODUCT | DECISION_TABLE | Layer-3 model for the per-item dynamic MODEL-SELECTION probe (INV-PROBE-*). | tools/lint/lint-model-declares-scaling-metric.py |
| system-models/model_sync_report.py | AGENT_META | INSTRUMENT | Model-sync drift-instrumentation report — composition over the standing sinks. | system-models/test_model_sync_report.py |
| system-models/model_trace_coverage.py | AGENT_META | INSTRUMENT | Trace-based model-element coverage — the fast, per-run complement to ``coverage_ref.py``'s slow, periodic instrumented LINE coverage. | system-models/kcoverage_exercise_harness.py; system-models/model_decision_telemetry_coverage.py; system-models/trace_model_tags.py |
| system-models/module_seam_ownership.py | AGENT_META | REGISTRY | Module-seam ownership — concern→canonical-seam map, Layer-3 meta-file sibling. | tools/lint/lint-module-seam-ownership-integrity.py |
| system-models/process_view.py | PRODUCT | TOPOLOGY | C1 Process view — the runtime process/concurrency projection over the composed SM model. | system-models/diagram_model.py |
| system-models/recovery_upload_first_trace_query.py | PRODUCT | INSTRUMENT | ``*_trace_query.py`` checker — INV-TQ-RECOVERY-UPLOAD-FIRST (Epic ``trace-emit-wiring-260912``, design ``phase-1-260912.md`` §7 candidate 3; Phase 7). | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/remediation_cost_budget.py | PRODUCT | BUDGET | Layer-3 SSOT for the remediation chunk-cost DYNAMICS model (INV-BUDGET). | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/remediation_graph.py | PRODUCT | DATAFLOW | RemediationGraph | tools/lint/lint-model-trace-coverage-totality.py; tools/lint/lint-trace-emit-site-parity.py; system-models/kcoverage_activation.py |
| system-models/remediation_graph_accuracy_provider.py | PRODUCT | REGISTRY (+BUDGET) | The ``ACCURACY`` attribute provider + the g-task→node join + the ``(variance, accuracy)`` 2×2 quadrant reading | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/remediation_graph_bounded_execution_provider.py | PRODUCT | REGISTRY (+BUDGET) | BoundedExecutionProvider — the BOUNDED-EXECUTION attribute PROVIDER on the remediation-graph substrate (worker-watchdog-bounded-execution-graph-visible-260825 Phase 5, Part B). | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/remediation_graph_checker_trust_provider.py | PRODUCT | REGISTRY | CheckerTrustProvider — the CHECKER-TRUST attribute PROVIDER on the remediation-graph substrate (checker-graph-suffix-ir-leverage-260830 Phase 2). | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/remediation_graph_complexity_provider.py | PRODUCT | REGISTRY (+BUDGET) | ComplexityProvider — the COMPLEXITY attribute provider on the remediation-graph substrate (Epic remediation-graph-substrate-260818, Phase 3b). | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/remediation_graph_config_provider.py | PRODUCT | REGISTRY | KindConfigProvider — the ``AttributeName.KIND_CONFIG`` attribute provider for the remediation-graph substrate. | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/remediation_graph_cost_provider.py | PRODUCT | REGISTRY (+BUDGET) | CostProvider — the COST attribute PROVIDER on the remediation-graph substrate. | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/remediation_graph_latency_provider.py | PRODUCT | REGISTRY (+BUDGET) | LatencyProvider — the LATENCY attribute PROVIDER on the remediation-graph substrate (per-node-timing-telemetry-260825 Phase 2). | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/remediation_graph_measured_provider.py | PRODUCT | REGISTRY (+BUDGET) | MeasuredAttributeProvider | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/remediation_graph_tolerance_provider.py | PRODUCT | REGISTRY (+BUDGET) | The ``DETERMINISM_TOLERANCE`` attribute provider + the K-run reproducibility scorecard machinery | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/remediation_graph_unit_test_provider.py | PRODUCT | REGISTRY | TestCoverageProvider — the TEST_COVERAGE attribute PROVIDER on the remediation-graph substrate (per-node-unit-test-remediation-graph-260826 Phase 2). | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/remediation_pipeline_phases.py | PRODUCT | DATAFLOW | RemediationPipelinePhases — a read-only PROJECTION that NAMES the PDF remediation pipeline's PHASES + checkpoint-group BOUNDARIES; NOT a runtime authority. | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/remediation_policy.py | PRODUCT | POLICY | RemediationPolicy — a read-only PROJECTION that NAMES the cross-format remediation POLICY axis; NOT a runtime authority. | web/testing/large_fixtures.py; web/testing/scale_corpus.py; web/testing/test_pipeline_harness_green_bar.py |
| system-models/remediator_checker.py | PRODUCT | REGISTRY | Layer-3 remediator⇄checker coverage-join model — a PROJECTION, not a re-derivation. | tools/lint/lint-invariant-verification-tier.py; system-models/repo-query.py; system-models/test_registry_form_invariants.py |
| system-models/required_env_per_role.py | AGENT_META | REGISTRY | The required-env-per-DISPATCH-ROLE model — the missing SoT (rule #33). | web/dispatch/config_completeness.py; deploy/cloud-run/deploy_cloudrun.py; system-models/components.py |
| system-models/rerun_idempotency_model.py | PRODUCT | CONSTRAINT_SET | Layer-3 SSOT for the RERUN-IDEMPOTENCY author-content-hash contract (Epic rerun-idempotency-incremental-remediation-260821, Phase 2 — folds §I-Fork-G G1). | web/clisubprocess/source_text_rerun.py; web/clisubprocess/test_source_author_hash_unit.py; web/clisubprocess/test_source_text_rerun.py |
| system-models/retention_policy.py | PRODUCT | POLICY | Single source of truth for the user-file retention policy. | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/role_instantiations.py | AGENT_META | REGISTRY | The role -> instantiation registry — the single source of truth the FidelityDial projects from. | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/runtime_census.py | AGENT_META | REGISTRY | Managed-runtime taxonomy — the census over each Component's primary runtime and heavy deps (Layer 3 meta-file). | tools/lint/lint-image-content-closure-unused-heavy-dep.py; system-models/components.py |
| system-models/scope_tiers.py | AGENT_META | REGISTRY | Canonical test/coverage scope-tier classification for Components. | tools/lint/lint-published-cli-no-testsupport.py; tools/lint/lint_all/scope_filter.py; system-models/components.py |
| system-models/serverless_phase_disposition.py | PRODUCT | DECISION_TABLE | SoT: the disposition of every GKE-DAG phase the serverless deploy leg does NOT run as one of its 3 plane-agnostic build targets. | tools/lint/lint-serverless-phase-drop-allowlisted.py; tools/lint/tests/test_lint_serverless_phase_drop_allowlisted.py |
| system-models/service_sizing.py | PRODUCT | BUDGET | Plane-independent per-service memory-sizing source of truth (SoT). | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/service_tiers.py | PRODUCT | REGISTRY | Canonical tier-class classification for service-flow Components. | tools/lint/lint-meta-file-cross-refs-with-tiers-blocking.py; tools/lint/lint-service-flow-annotations-required.py; tools/lint/lint-service-flow-model.py |
| system-models/staging_covariate.py | PRODUCT | SCHEMA | Staging size-covariate telemetry schema + the growth-confirmation output types. | tools/chunkless/derive_growth_confirmation.py |
| system-models/state_machines.py | PRODUCT | STATE_MACHINE (+CONSTRAINT_SET) | Typed Layer-3 SSOT for the composed cross-service state-machine model. | tools/lint/_bespoke_decls.py; tools/lint/lint-agent-orch-reflection-facet-registry.py; tools/lint/lint-invariant-verification-tier.py |
| system-models/state_mutator_registry.py | PRODUCT | CONSTRAINT_SET | Canonical single-writer / monopoly contracts for state-mutation functions. | tools/lint/lint-genai-through-batchrenderer.py; tools/lint/lint-lua-contract.py; tools/lint/lint-meta-file-cross-refs-with-tiers-blocking.py |
| system-models/stop_hook_governance.py | AGENT_META | CONSTRAINT_SET | system-models/stop_hook_governance.py — the Stop-event governance model (map == territory). | system-models/test_stop_hook_governance.py |
| system-models/strip_order_trace_query.py | PRODUCT | INSTRUMENT | Worked-example ``*_trace_query.py`` checker | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/supported_filetypes.py | PRODUCT | REGISTRY | Canonical frozen registry of the four document filetypes supported by ADATool. | tools/build/gen_advertised_formats.py; tools/build/gen_format_capabilities.py; web/server.py |
| system-models/symbol_resolution.py | AGENT_META | INSTRUMENT | Canonical AST-first symbol-in-file resolver — the ONE shared seam (rule #11 / CC-3). | tools/lint/lint-state-machine-model-drift.py; system-models/metric_ref.py; system-models/test_symbol_resolution.py |
| system-models/synchronization.py | PRODUCT | REGISTRY | Canonical synchronization-lock registry for dev-time OS primitive inventory. | system-models/test__synchronization_doc_derived.py |
| system-models/task_model.py | PRODUCT | INTERACTION | The typed TASK-CLOSURE model — every user journey as (entry → flow → CLOSURE). | system-models/repo-query.py |
| system-models/telemetry_collection.py | AGENT_META | REGISTRY | Canonical TELEMETRY-COLLECTION PROVENANCE model — a MODELS-BRIDGE inventory of collection-points. | system-models/role_instantiations.py; system-models/telemetry_surface_binding.py; web/testing/stage_rusage.py |
| system-models/telemetry_idjoin_model.py | PRODUCT | SCHEMA | Canonical TELEMETRY ID-JOIN model — the typed SoT for the agent-token capture/join collapse. | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/telemetry_surface_binding.py | PRODUCT | REGISTRY | Canonical TELEMETRY-FEED ↔ SURFACE binding model — the CONSUMER half of the observability graph. | system-models/anomaly_detectors.py |
| system-models/test_repo_query_invariant_coverage.py | — | — | Pin tests for ``repo-query.py models invariant-coverage`` (form-taxonomy Phase 5). | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/timeout_budgets.py | PRODUCT | BUDGET | Typed Layer-3 SSOT for the pipeline timeout-budget ordering model. | tools/lint/lint-budget-guard-domination.py; tools/lint/lint-timeout-budget-composition-parity.py; tools/lint/lint-timeout-budget-ordering.py |
| system-models/trace_model_links.py | AGENT_META | INSTRUMENT | Bidirectional model↔code↔trace RESOLVE + the two peer DISCOVERY signals | system-models/test_trace_model_links.py |
| system-models/trace_model_tags.py | AGENT_META | REGISTRY | The DECLARED model-ID tag vocabulary | system-models/recovery_upload_first_trace_query.py; system-models/strip_order_trace_query.py; system-models/trace_model_links.py |
| system-models/trace_query.py | PRODUCT | SCHEMA | Invariants-as-trace-queries | system-models/recovery_upload_first_trace_query.py; system-models/strip_order_trace_query.py; system-models/upload_before_parent_trace_query.py |
| system-models/traceability.py | AGENT_META | SCHEMA | Typed traceability SCHEMA for the model↔code linkage graph (mbse-sync P4-a). | tools/unit_test_all/traceability_coverage.py; system-models/traceability_builder.py; tools/unit_test_all/test_traceability_coverage.py |
| system-models/traceability_builder.py | AGENT_META | INSTRUMENT | The traceability GRAPH-BUILDER + the 6 resolvers behind the P4-a schema (mbse-sync P4-b). | tools/lint/lint-default-dependents-liveness.py; tools/lint/lint-dfd-code-cite-resolution.py; tools/lint/lint-dfd-fk-resolution.py |
| system-models/upload_before_parent_trace_query.py | PRODUCT | INSTRUMENT | Cross-SM ``*_trace_query.py`` checker — INV-TQ-UPLOAD-BEFORE-PARENT (Epic ``trace-emit-wiring-260912``, design ``phase-1-260912.md`` §7 candidate 2; Phase 7). | (no direct importer found; loaded generically by the repo-query model walker) |
| system-models/user_feedback.py | PRODUCT | DATAFLOW | Tiny system-model of the user-feedback subsystem (report → persist → admin retrieval). | system-models/test__user_feedback_doc_derived.py |
| system-models/ux_surfaces.py | PRODUCT | REGISTRY | Layer 3 meta-file: UX-surface write-authority registries for frontend trees. | tools/lint/lint-editor-dispatch-monopoly.py; tools/lint/lint-editor-oplog-monopoly.py; tools/lint/lint-meta-file-cross-refs-with-tiers-blocking.py |
| system-models/verification_policy.py | PRODUCT | POLICY | Remediation VERIFICATION-POLICY model — a PROJECTION of the C# registry SoT. | system-models/components.py; system-models/repo-query.py |
| system-models/warm_path_segments.py | PRODUCT | BUDGET | Warm-remediation critical-path SEGMENT MODEL (sibling of the cold-start model). | tools/lint/lint-warm-path-model-boundaries.py; tools/perf/warm_path_critical_path.py |
| system-models/wcag_coverage_gaps.py | PRODUCT | REGISTRY | Canonical WCAG-coverage-gap registry for ADAtool rules. | system-models/test__wcag_coverage_gaps_doc_derived.py; system-models/test_wcag_coverage_gaps.py |
| system-models/worker_rss_sizing_model.py | PRODUCT | BUDGET | ``worker_rss_sizing_model`` — the peak-RSS prediction that sizes ``worker-chunkless``. | system-models/chunkless_concurrency_sizing_model.py; system-models/test_chunkless_concurrency_sizing_model.py |

---

## 5. Status

All four items are complete (nothing partial): counts verified against R1 (86 = 64+20+2 invariants; 130 `MODEL_FORM` files reconciled as 129 records + 1 fixture; 128-node/57-edge graph; 10-state/19-transition chunk lifecycle), all four DOT files render clean under `dot -Tsvg`, both CSVs re-parsed to the stated row counts, and each item carries its two labeled bonus facts. Extraction ran at HEAD `621c05852a` with byte-equivalence to baseline `3baabd775d` proven per-source in §0.
