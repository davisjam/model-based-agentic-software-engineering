# R1-response-A — DocAble model inventory + authoritative representations
**Round:** 1 (response A of B)  **From:** DocAble repo owner (Fable evidence-extraction pass, orchestrated by Claude Opus)  **To:** Chapter-2 reviewer
**Responds-to:** query.md #1–#10  **Model:** Fable  **Date:** 2026-09-22  **Repo-commit:** 3baabd775d

All `path:line` cites are against the DocAble repo at commit `3baabd775d` (verified `git rev-parse HEAD` at extraction time). Every emitted fragment below is verbatim source, bounded to a semantically complete portion; nothing is reconstructed from implementation where an authoritative model exists. Where the talk's headline numbers have drifted at this commit, the live number is stated and the drift noted — models here are *live artifacts*, so their populations move.

**Census ground truth at this commit.** Every discoverable model under `system-models/` carries module-level `MODEL_KIND` + `MODEL_FORM` bare-string declarations validated against the `ModelKind` / `ModelForm` enums in `system-models/_typed_primitives.py:91` / `:132`. At this commit **130 model files declare a `MODEL_FORM`** (the talk's "127" has since grown), distributed: REGISTRY 50, INSTRUMENT 17, BUDGET 12, SCHEMA 11, CONSTRAINT_SET 10, DATAFLOW 8, TOPOLOGY 7, STATE_MACHINE 4, POLICY 4, DECISION_TABLE 4, INTERACTION 2. Kinds: PRODUCT 77, AGENT_META 51, ENVIRONMENT 1. (Counted by `grep -c 'MODEL_FORM = ' system-models/*.py` at HEAD; one registry-walking lint, `lint-model-kind-declared.py`, and `repo-query models forms` both resolve the strings through the enum, so an invalid declaration fails loud.)

---

## #1 — Inventory: 10 models spanning MODEL_KIND × MODEL_FORM

Selection rule applied: every row is **actively consumed by tooling or production code** (consumers cited); documentary-only models were excluded. The required classes are covered: topology (rows 3, 4), state machine (rows 1, 2), dataflow/dependency (rows 4, 5), constraint/invariant (row 1), ownership/authority (row 6), quantitative/budget (row 8), provenance/evidence (row 9), registry/schema (rows 7, 10).

| # | Model (path) | KIND | FORM | Engineering question answered | Authoritative source | Consumer(s) | What it controls | Why representative |
|---|---|---|---|---|---|---|---|---|
| 1 | Composed cross-service SM + invariant model — `system-models/state_machines.py` | PRODUCT | STATE_MACHINE (+CONSTRAINT_SET) | "Which cross-service properties must hold, and what checker does each OBLIGATE?" | Typed frozen dataclasses: 7 `StateMachineSpec` + 4 `SeamConnector` + **86 `ConstraintBlock`** + 4 `ProtocolTrace` (`MODEL` at `state_machines.py:492`) | `tools/lint/lint-invariant-verification-tier.py` (BLOCKING, rule #57), S-1 drift lint, `lint-tla-property-matches-model.py`, repo-query | Which invariants exist, which verification artifact (BFS simworld / TLC / property test) each MUST have — a missing checker is a lint finding | The talk's "87 cross-service invariants" model (86 at this commit); tier is *derived*, never hand-typed |
| 2 | Chunk lifecycle SM — `web/jobtypes/statemachine.py:167-247` | PRODUCT | STATE_MACHINE | "What states can a chunk sub-job be in, and which transitions are legal?" | `ChunkState` Enum + `CHUNK_TRANSITIONS` dict + `CHUNK_TERMINAL_STATES` frozenset — executable Python, enforced at runtime | `web/worker.py:2537,3033` (`JobStateMachine` runtime enforcement), `web/pipeline.py:126`, model row 1 looks it up (`state_machines.py:734-741`), driving-condition + property + DDT tests | Every chunk state write in production — an illegal transition **raises** | The talk's chunk-lifecycle example; the model IS the enforcement |
| 3 | Component/zone topology — `system-models/components.py` | AGENT_META | TOPOLOGY | "What zones exist, which files belong to whom, what may import what?" | ~6,400-line `COMPONENTS` tuple of frozen `Component` records (dataclass at `:238`) — **103 leaves, 109 audit zones** at this commit | `tools/agents/run-agent-audits.py` (per-zone agent sweep), `run-cloc` (LoC partition), `lint-component-import-boundaries`, docs living-list lints | Zone membership, audit partitioning, LoC accounting, declared import boundaries | The talk's "~115 zones" topology (109 live); membership is glob-resolvable, overlap is a BLOCKING lint |
| 4 | InterServiceCall sync-edge contract — `system-models/interservice_edges.py` | PRODUCT | TOPOLOGY | "Which service calls which, over what transport, under what auth contract?" | `SYNC_EDGES: tuple[SyncEdge, ...]` (`:284`), typed `AuthContract` (`:195`) with a semantic completeness predicate | deploy-config-coherence gate, `lint-interservice-backstage-parity`, INV-ISC-X8 parity pin (derives `DOWNSTREAM_URL_DEPS` byte-identically) | Whether deploy config (OIDC audience + `run.invoker` grants) coheres with declared edges | One typed SoT replacing four scattered per-edge encodings |
| 5 | Compliance DFD — `system-models/data_flow.py` | PRODUCT | DATAFLOW | "Where does user data rest and flow, and is each flow lawful/deletable?" | pytm-vocabulary `Datastore`/`Dataflow`/`FlowRule` records with a GDPR spine (retention, deletion-reachability, lawful-basis) | `lint-dfd-sink-coverage.py` (model==territory drift lint), Rego policy `system-models/policies/info_flow.rego` | Article-30 record-of-processing; forbidden-flow denial (FR-1) | Gaps are *modeled, not hidden* (`deletion_reachability=UNREACHABLE` ⚠️PII-1) |
| 6 | Lease/claim ownership model — `web/dispatch/schema.py:163-260` + `state_machines.py:4456` | PRODUCT | SCHEMA (ownership/authority) | "Who may claim/complete/reap this job, and when does authority lapse?" | `InFlightLease` + `ChunkHeartbeatLease` key classes (invariant-bearing docstrings INV-LEASE / INV-REAP-1) + `lease-fencing` `ProtocolTrace` + `SMContext.lease_epoch` (`web/jobtypes/statemachine.py:585`) | scaler demand read, completer orphan-reclaim, chunk reaper, simworld falsifiability check `test_falsifiability_epoch_fence_off_finds_double_terminal` | Which process is allowed to write a terminal state; when a silent-death claim is revocable | Temporal authority (issue-epoch fencing) made a first-class named model |
| 7 | Entitlement/admit decider — `system-models/entitlement_model.py` | PRODUCT | DECISION_TABLE | "Can this user upload N pages of this format, and which credit group pays?" | Pure typed decider `decide_admit` (`:307`) emitting `AdmitDecision` + ordered `PlanStep` chain (`:245-269`) | `web/upload_credit_gate.py`, `web/quota_gate.py` (production hot path), parity pin `web/test_entitlement_reproduce_pin.py` | The admit/reject verdict + draw order; born from a production paywall RCA (lossy scalar projection) | Cleanly splits deterministic policy from concurrency left to the IO shell (INV-ENT-PURE) |
| 8 | Worker peak-RSS sizing — `system-models/worker_rss_sizing_model.py` | PRODUCT | BUDGET | "How much memory must `worker-chunkless` be provisioned with?" | `M_pred = P_predicted + reserve` closed-form (module doc `:5-30`), `predict_peak_rss` (`:422`), provenance-tagged `CalibrationCell` constants | `web/chunking/chunkless_coordinator.py`, `lint-chunkless-dial-coherence.py`, staging cgroup sweep via `validate_conservative` (`:561`) | The Cloud Run `--memory` tier (`derive_memory_tier_mib` `:472`); graduation BLOCKS if measured > predicted | Quantities compose, units explicit (MiB), model is falsifiable against cgroup `memory.peak` |
| 9 | Mutator attribution registry — `backend/src/AdaTool.PdfModel/Stamp/MutatorStampHelper.cs:44` + `Readers/PdfAttributionRegistry.cs:50` | PRODUCT | REGISTRY (provenance/evidence) | "Which pass/mutator/verb made THIS mutation in THIS shipped artifact?" | Catalog `/AdaToolAttribution` registry embedded in the output PDF: per-entry Mutator/Verb/Pass/RunId/Action/Callsite/Timestamp/TargetKind/TargetRef/ScopeId | `ada-tool derive-changelog`, `strip-attribution`, F10 lint `lint-mutator-stamp-wiring.py` (BLOCKING: every mutator verb MUST wire a stamp) | Whether a remediation can be explained + reversed; per-mutation evidence travels *inside* the artifact | Provenance as structure, not logs — evidence survives the pipeline and ships with the document |
| 10 | Numbered-rule registry — `system-models/claude_md_rules.py` | AGENT_META | REGISTRY | "Which governance rules exist, what code do they govern, which lint enforces each?" | `RULES` dict keyed by rule id, fields `title`/`component_tags`/`applies_to`/`linted_by` | `lint-claude-md-rule-meta-coverage.py` + `lint-claude-md-rule-meta-conformance.py` (both BLOCKING, declared in `VERIFIED_BY` `:61`), `repo-query` | Bidirectional doc↔registry coverage: a rule without an entry, or an entry without a rule, is a finding | A registry *about the governance layer itself* — the models-bridge made queryable |

---

## #2 — Behavioral model: the chunk lifecycle

**Location.** The authoritative model is `web/jobtypes/statemachine.py` — a Layer-0, zero-I/O module. It is not a diagram *of* the implementation; it is the executable representation the production worker enforces on every transition. No separate documentary model exists or is needed: the model-layer entry (`system-models/state_machines.py:734-741`, `_SM_CHUNK`) **looks these tables up** via `_states_of("ChunkState")` / `_transitions_of("CHUNK_TRANSITIONS")` rather than copying them (rule #42), so there is exactly one source.

**Authoritative emission** (`web/jobtypes/statemachine.py:167-247`, comments elided only where marked):

```python
class ChunkState(Enum):
    """State machine for chunk sub-jobs processed by workers."""
    IDLE = "idle"
    CLAIMED = "claimed"
    DOWNLOADING = "downloading"
    PROCESSING = "processing"
    UPLOADING = "uploading"
    CANCELLING = "cancelling"     # parent cancelled — cleaning up, no work done
    COMPLETING = "completing"
    FAILED = "failed"
    REQUEUING = "requeuing"
    # Time-based baton handoff (...): the CLI committed a durable PARTIAL result and
    # handed off the remaining work to a fresh envelope (exit-7 BATON terminal).
    # A SUCCESS terminal — the leg banked a durable milestone — NOT a failure and
    # NOT a requeue of THIS row (INV-BAT-7: the continuation is NEW scheduled work
    # `(unit_id, leg+1)`, ...). Reached only from UPLOADING (the intermediate
    # document + manifest are uploaded to durable JobStore BEFORE this terminal is
    # written — INV-BAT-4 durable-before-terminal ...).
    BATON_HANDOFF = "baton_handoff"

# Valid transitions. Each key maps to the set of states it can transition TO.
CHUNK_TRANSITIONS: dict[ChunkState, set[ChunkState]] = {
    ChunkState.IDLE: {ChunkState.CLAIMED},
    ChunkState.CLAIMED: {ChunkState.DOWNLOADING, ChunkState.FAILED},
    ChunkState.DOWNLOADING: {ChunkState.PROCESSING, ChunkState.FAILED, ChunkState.CANCELLING},
    ChunkState.PROCESSING: {ChunkState.UPLOADING, ChunkState.FAILED, ChunkState.REQUEUING, ChunkState.CANCELLING},
    # UPLOADING -> BATON_HANDOFF is the durable-before-terminal handoff edge
    # (INV-BAT-4): ... There is NO PROCESSING -> BATON_HANDOFF shortcut (upload
    # must precede the terminal) and NO FAILED -> BATON_HANDOFF edge (BATON is
    # reachable ONLY from a successful durable commit — INV-BAT-7).
    ChunkState.UPLOADING: {ChunkState.COMPLETING, ChunkState.BATON_HANDOFF, ChunkState.FAILED, ChunkState.CANCELLING},
    ChunkState.CANCELLING: {ChunkState.COMPLETING},
    ChunkState.COMPLETING: {ChunkState.IDLE},
    ChunkState.FAILED: {ChunkState.IDLE},
    ChunkState.REQUEUING: {ChunkState.IDLE},
    ChunkState.BATON_HANDOFF: {ChunkState.IDLE},
}

CHUNK_TERMINAL_STATES: frozenset[ChunkState] = frozenset({
    ChunkState.IDLE, ChunkState.COMPLETING, ChunkState.FAILED,
    ChunkState.REQUEUING, ChunkState.CANCELLING, ChunkState.BATON_HANDOFF,
})
```

**States and semantics.** The success spine is exactly the talk's `idle → claimed → downloading → processing → uploading → completing` (then `→ idle` reset). Failure (`FAILED`) is enterable from every working state but is a *dead end that resets* — `FAILED → {IDLE}` only, encoding the repo-wide "failure paths never requeue" doctrine (lint `lint-no-failure-requeue.py`; the ONLY sanctioned automatic requeue is the autoscaler-preemption path, reachable as `PROCESSING → REQUEUING`). Cancellation (`CANCELLING`) is enterable only from `DOWNLOADING`/`PROCESSING`/`UPLOADING` and must pass through `COMPLETING` (cleanup is not skippable). The 2026-09 addition `BATON_HANDOFF` is a *success* terminal reachable **only from `UPLOADING`** — the transition table itself encodes the durable-before-terminal guard (INV-BAT-4): there is deliberately no `PROCESSING → BATON_HANDOFF` edge, so a baton cannot be recorded before the partial result is durably uploaded, and no `FAILED → BATON_HANDOFF` edge, so a failure cannot masquerade as a banked milestone (INV-BAT-7).

**Transition guards/enforcement.** Guards live in `JobStateMachine.transition` (`web/jobtypes/statemachine.py:624-630`): an illegal transition **raises `ValueError`** — the model is enforced, not advisory. `terminal_states` is a *required constructor argument* (`:598-603`): an SM constructed without an explicit terminal set is a constructor error, so `ensure_terminal()` force-fail semantics can never silently default. `on_enter`/`on_exit` hooks give guaranteed side effects per state; each transition also emits a typed span + a model-coverage record (`:645-668`), so the runtime stream is joinable back to the model.

**Consumers (all verified at HEAD).**
- **Production:** `web/worker.py:2537` and `:3033` construct `JobStateMachine(job_id, ChunkState.IDLE, CHUNK_TRANSITIONS, ..., terminal_states=CHUNK_TERMINAL_STATES)` — every chunk the fleet processes is driven through this table. `web/pipeline.py:126` re-exports it as the coordinator-facing seam.
- **Model layer:** `system-models/state_machines.py:734-741` (`_SM_CHUNK`) looks up states/transitions/terminals from this module and adds the `impl_ref` (worker_tick) + `verify_refs` legs, making the SM a node in the composed cross-service model of #7.
- **Checkers:** `web/test_chunkstate_driving_conditions.py` (driving-condition suite cited as the SM's verify leg), `web/test_jobtypes_statemachine_property.py`, `web/test_jobtypes_ensure_terminal_property.py`, `web/jobtypes/test_statemachine_doc_derived.py` (DDT pin), plus the simworld BFS checkers under `web/test_simworld/` that compose this SM with the completer/introducer lanes.

---

## #3 — Structural/topology model: the component-zone model

**Location.** `system-models/components.py` — a ~6,400-line typed registry of `Component` records. At this commit the live counts are **103 leaf zones and 109 audit zones** (`leaves()` + `groups()`, executed at HEAD via `components.audit_zones()`); the talk's "~115" reflects an earlier census — zones retire and merge (e.g. the gke-migration zone retirement noted at `:3388-3393`).

**What a zone is.** Three kinds coexist in `COMPONENTS` (module doc `:27-50`): `kind="leaf"` — a disjoint LoC-counting + audit unit owning specific `focus_dirs`/files; `kind="group"` — an audit sub-zone spanning several leaves to catch *cross*-zone concerns (cross-XModel divergence); `kind="meta"` — LoC-accounting buckets that are not audit zones. The record schema (dataclass at `:238-347`, field docs abridged):

```python
@dataclass(frozen=True)
class Component:
    name: str                 # unique kebab-case id, e.g. "pdf-model"
    focus_dirs: tuple[...]    # repo-relative dirs/files making up the component
    exclude_subdirs: tuple    # walk/count exclusions (dir-only, cloc --not-match-d)
    exclude_files: tuple      # file-level carve-outs (cloc --exclude-list-file)
    file_globs: tuple         # glob-partition of a SHARED root without moving files;
                              # match SPECIFICITY = literal-prefix length, so a
                              # full-path glob OUT-RESOLVES a catch-all
    tags: frozenset[str]      # audit-zone filter tags (AGENT_REQUIRED_TAGS matching)
    kind: str                 # "leaf" | "group" | "meta"
    docs: ComponentDocs       # read-first / optional-depth doc pointers
    dockerfile: str | None    # service-tagged zones: production Dockerfile
    k8s_manifest: str | None
    import_allowed_components: tuple[str, ...]  # declared import boundary
```

**A representative leaf** (`:694-743`, abridged — note the model records *why* exclusions exist, with RCA cites):

```python
Component(
    name="ux-batch",
    focus_dirs=(RepoRelPath("web/static"),),
    # a11y-view is the SHARED cross-format editor VIEW substrate — it belongs
    # to the DocAble-Editors group (ux-editor-shared-view leaf), NOT to the
    # batch-upload SPA. Excluding it here moves its ~800 LoC out of ux-batch
    # so the editor group's real investment is visible and not double-counted ...
    exclude_subdirs=(
        RepoRelPath("web/static/editor"),
        RepoRelPath("web/static/a11y-view"),
        RepoRelPath("web/static/spa"), ...
        RepoRelPath("web/static/admin-dashboard.html"),
        RepoRelPath("web/static/admin-dashboard.ts"),
    ),
    tags=frozenset({"frontend"}),
    kind="leaf",
    boundary_kind="internal",
    display_name="DocAble-Batch",
    description="Main upload SPA + user-facing pages: ...",
    docs=ComponentDocs(core=(RepoRelPath("docs/ux/ux-design.md"), ...)),
)
```

**Relationships recorded:** file→zone membership (with a specificity-resolved glob mechanism so several leaves can partition one shared directory *without* physical moves — `:269-297`); zone→group containment; zone→docs pointers; zone→deployment artifacts (Dockerfile/manifest for service zones); and *declared import boundaries* (`import_allowed_components`, `:328-347` — `shared/` implicitly allowed everywhere, unknown name tokens are themselves lint findings).

**Deliberately omitted:** call graphs, runtime dataflow, and API surfaces — those live in the orthogonal Layer-3 models (`interservice_edges.py`, `data_flow.py`, the service-flow model; the module doc at `:79` points there explicitly). The topology answers only *who exists, who owns which files, who may touch whom statically*.

**Consumers:** `tools/agents/run-agent-audits.py` (the per-zone agent sweep — tags drive `AGENT_REQUIRED_TAGS` matching, `:299-300`); `run-cloc` (LoC partitioned by zone; globs resolved at report-time so LoC is never double-counted, `:294-297`); `lint-component-import-boundaries` (checks every import statement in a zone's Python against the declared set); the components-model structural test + covers-every-surface lint.

**A concrete invalid change made detectable:** two leaves claiming the same file. "Two leaves MUST NOT claim the same file (checked structurally by the components-model test + the covers-every-surface lint)" (`:294-296`) — e.g. adding `web/static/admin-dashboard.ts` to a second leaf's `focus_dirs` without the carve-out at `:723-724` trips the components-focus-dir-overlap BLOCKING lint. Similarly, adding `import web.dispatch` to a zone whose `import_allowed_components` excludes it turns an architecture violation into a lint finding rather than a code-review hope.

---

## #4 — Dataflow/dependency model: the compliance DFD

**Location.** `system-models/data_flow.py` (`MODEL_KIND = "PRODUCT"`, `MODEL_FORM = "DATAFLOW"`, `:68-69`). Chosen over the also-strong `remediation_graph.py`/`remediation_pipeline_phases.py` because it crosses every component that touches user data, carries the richest edge semantics, and is consumed by two enforcement mechanisms. The element taxonomy is deliberately *adopted*, not invented: OWASP **pytm** vocabulary (Actor / Process / Datastore / Dataflow / Boundary), extended with the compliance dimensions pytm leaves implicit — retention, governing-policy linkage, and the GDPR spine access-/deletion-reachability + lawful-basis (module doc `:17-23`).

**Nodes** are `Datastore` records — one per real sink, transcribed from ground-truth tables, never re-derived. Representative emission (`:509-532` — chosen because it *models a gap honestly*):

```python
Datastore(
    id="jobs",
    store_kind=StoreKind.POSTGRES,
    owning_component="web",
    trust_boundary=BOUNDARY_ADATOOL,
    data_classes=frozenset({DataClass.PII_INDIRECT}),
    identifier_kind=IdentifierKind.INDIRECT,   # client_ip + filename
    singling_out=SinglingOut.LINKABLE,
    special_category_risk=Art9Risk.NO,         # metadata (not the doc content itself)
    access_reachability=Reachability.MANUAL,   # job-costs --by-email
    deletion_reachability=Reachability.UNREACHABLE,  # ⚠️PII-1: NOT cascaded
    lawful_basis=LawfulBasis.CONTRACT,
    purpose="job lifecycle + remediation report metadata",
    retention_bindings=frozenset({
        _pg_binding(Retention.INDEFINITE, "row persists", EnforcementStatus.NONE,
                    "⚠️ none — row persists indefinitely (F1); not in delete_user cascade (⚠️PII-1)"),
    }),
    encryption=_PG_ENCRYPTION,
    authorized_readers=frozenset({Role.OWNING_USER, Role.ADMIN}),
    tenant_scope=TenantScope.PER_USER,
    residency=Residency.US,
    governing_policy=_POL_RETENTION,
)
```

**Edges** are `Dataflow` records; the boundary-crossing one (`:963-975`):

```python
_VENDOR_EGRESS_FLOW = Dataflow(
    id="egress/genai",
    source="genai-service",
    sink="vendor/genai",
    seam="network",
    data_classes_in_motion=frozenset({DataClass.USER_CONTENT}),
    crosses_boundary=True,  # A13 — leaves ADATool trust boundary (Art. 44)
    external_actor="openai-or-vertex",
    vendor_dpa_reference=None,  # ⚠️G-EGRESS: unpinned gap
    allowed_producers=frozenset({"genai-service"}),
    allowed_consumers=frozenset({"openai-or-vertex"}),
    auth_mechanism=AuthMechanism.SERVICE_TOKEN,
)
```

**Edge semantics/annotations:** each edge names the data classes *in motion*, whether it crosses the trust boundary, the external actor, the DPA reference (or its absence), the allowed producer/consumer sets, and the auth mechanism. On top of nodes+edges sit `FlowRule` forbidden-flow predicates (`:1006` FR-1: "user-content MUST NOT reach a third-party-vendor sink unless through guard G" — and the model records that today `unless_through_guard=None`, so FR-1 *denies*); a Rego policy (`system-models/policies/info_flow.rego`) evaluates the rules over the edges + GDPR spine.

**Engineering questions answered from this representation:** (a) *deletion reachability* — "if this user invokes GDPR erasure, which sinks are actually cleared?" is a column scan (`jobs` answers UNREACHABLE, ⚠️PII-1 — a live, declared finding, not a hidden one); (b) *boundary egress* — "does user content leave our trust boundary, and under what contract?" (exactly one egress edge; its DPA is modeled as unpinned); (c) *forbidden-flow reachability* — FR-1 evaluated mechanically by Rego; (d) *validation placement* — a new sink not appearing here trips `lint-dfd-sink-coverage.py`, the model==territory drift lint, so the DFD cannot silently under-enumerate.

---

## #5 — Ownership / authority model: leases, claims, and the epoch fence

**Location.** The authority model lives in three coordinated places, all typed: the Redis key schema classes in `web/dispatch/schema.py` (the sole raw-Redis seam, lint-enforced), the `lease-fencing` `ProtocolTrace` in `system-models/state_machines.py:4456-4472`, and the `SMContext.lease_epoch` slot in `web/jobtypes/statemachine.py:576-585`. Together they answer "who may claim/complete/reap this job, and when does that authority lapse."

**Entities and temporal semantics.** Emission 1 — the parent-grain lease (`web/dispatch/schema.py:163-206`, abridged):

```python
class InFlightLease:
    """Spanning in-flight parent-job lease (SORTED SET, score = issue-epoch).
    ...
    Member = parent ``job_id``. Score = ``time.time()`` at PARENT-CLAIM.
    The lease is:
      * SET atomically when the introducer wins the parent-claim CAS
        (``job_introducer._process_introducer_job``),
      * CLEARED at the parent's terminal ``on_enter`` hooks (COMPLETED / FAILED ...),
        so it spans the ENTIRE parent lifecycle INCLUDING the merge,
      * COUNTED by the scaler's demand read (``WorkerPoolScaler.get_queue_depth``) ...

    Staleness (``LEASE_STALE_SECONDS``, ..., default 900s): the LIVE count is
    ``zcount(now - stale, "+inf")`` so a lease orphaned by a crash-before-clear
    drops out of the demand count after the window ... Stale members are reclaimed
    by the completer's orphan-reclaim scan via the SANCTIONED PREEMPTION requeue
    (NEVER a failure requeue).

    INV-LEASE (Q4): the scaler's demand count is NEVER zero/negative while a
    parent is genuinely in flight ... A transient positive OVER-count ... is
    ACCEPTED — over-count keeps a worker warm briefly (safe; self-heals).
    UNDER-count (the GAP-B drain) is the direction the lease forbids.
    """
    KEY = f"{_PREFIX}adatool:inflight-lease"
```

Emission 2 — the chunk-grain heartbeat lease (`:215-259`, abridged) is *distinct on three declared axes* — grain (chunk vs parent), lifecycle (set-at-claim CAS, renewed per 30s heartbeat, cleared-at-terminal; an unclaimed chunk has NO lease so cold-start can never be false-reaped), and consequence (a lapsed lease is CAS-reaped to FAILED, **never** requeued — a poison input would re-hang). Its safety obligation is INV-REAP-1 (`:258`), a SAFETY_BFS-tier invariant.

Emission 3 — the split-brain fence, model side (`system-models/state_machines.py:4456-4472`):

```python
ProtocolTrace(
    name="lease-fencing",
    participants=("worker", "job-completer"),
    coord_primitive=CoordPrimitive.EPOCH_FENCE,
    invariants=("INV-8",),
    verify_refs=(
        VerifyRef(VerifyKind.SIMWORLD,
                  "web/test_simworld/test_lease_model_check.py",
                  "test_falsifiability_epoch_fence_off_finds_double_terminal"),
    ),
    seams=(SeamKind.REDIS_DISPATCH,),
    description="In-flight-lease issue-epoch fence (split-brain reclaim guard).",
)
```

and its runtime carry-slot (`web/jobtypes/statemachine.py:576-585`): the completer snapshots the lease's *issue-epoch* when it wins the merge claim; the terminal hook passes it to an epoch-CAS lease clear, so "a reclaim that re-issued a newer epoch mid-merge is NOT clobbered by this worker's late clear."

**Enforcement points:** the claim CAS (`STATUS_QUEUED → STATUS_REMEDIATING` + the Cloud Tasks lease/ack — see INV-1 in #7), the terminal `on_enter` hooks, the completer's stale-reclaim scan, and the epoch-CAS clear. Authority is thus temporal and revocable: possession = a fresh score in a sorted set; lapse = falling out of the `zcount` window; revocation = a CAS the holder can lose.

**A failure legible only through the model:** the split-brain double-terminal. Worker A claims a parent, stalls mid-merge past the 900s window; the completer reclaims, re-issues a *newer epoch*, and hands the job to worker B; A then wakes and finishes. In raw code this is a needle across four files and two processes. In the model it is one named primitive (`EPOCH_FENCE`), one invariant (INV-8), and — decisively — a **falsifiability check**: the simworld test *turns the fence off and asserts the double-terminal appears* (`test_falsifiability_epoch_fence_off_finds_double_terminal`), proving the fence is load-bearing rather than decorative.

---

## #6 — Decision/constraint model: the entitlement/admit decider

**Location.** `system-models/entitlement_model.py` (`MODEL_KIND="PRODUCT"`, `MODEL_FORM="DECISION_TABLE"`, `:65-66`). This is not documentation of policy — it is the *single policy authority*, consumed on the production hot path by `web/upload_credit_gate.py` and `web/quota_gate.py`, and it exists because of a production defect: the pre-model scalar projection (`get_credit_balances` summed non-unlimited groups) returned 0 for pure-unlimited institutional users and **paywalled them** (RCA `docs/rca/purdue-institutional-upload-paywall-260824.md`; module doc `:17-20`).

**Decision dimensions** (inputs): the user's credit groups (`GroupEntitlement` `:167` — group type INSTITUTIONAL/INDIVIDUAL, unlimited mode, balance, resolved cap, month-to-date usage), the upload format (`CreditFormat`, with `PDF_CREDIT_MULTIPLIER = 2` / `OFFICE_CREDIT_MULTIPLIER = 1`, `:113-114`), the page count, and a `prefer_personal` flip.

**Outputs/obligations** — the verdict record (`:245-269`):

```python
@dataclass(frozen=True)
class PlanStep:
    """One group's verdict in the ordered draw-chain plan (REVISE-2)."""
    group_id: str
    outcome: StepOutcome
    available: int  # spendable credits considered (finite groups); 0 for unlimited
    is_admit: bool

@dataclass(frozen=True)
class AdmitDecision:
    admit: bool
    credits_needed: int
    drawn_group_id: str | None = None    # the group that pays on admit
    drawn_is_unlimited: bool = False
    plan: tuple[PlanStep, ...] = field(default_factory=tuple)
    reject_reason: str = ""
```

The decider `decide_admit(groups, format_kind, pages, *, prefer_personal=False)` (`:307`) walks the draw chain in the exact order both legacy server deciders used: **R1** draw order (`draw_order` `:271` — institutional groups first, then personal, a *stable partition* so the emitted bundle's array order IS the draw order), then per group **R3** the cap gate (`used + needed > cap` → skip), the **unlimited⇒admit** short-circuit, and finite-balance sufficiency; `user_is_unlimited` (`:290`) is the SOLE user-level unlimited predicate (INV-ENT-5), with a lint (`lint-entitlement-scalar-gate-allowlist`) barring any new hand-rolled `any(...is_unlimited...)` gate outside the single server adapter.

**How the environment enforces it:** the model's INV-ENT-* invariants carry a **derived** `verification_tier` via the same `derive_verification_tier` machinery as #7 (a pure decider is one computation lane, `CoordPrimitive.NONE` ⇒ LINEAR_PROPERTY ⇒ a property test is mandatory: `system-models/test_entitlement_model.py`); a cross-runtime parity corpus (`web/test_entitlement_reproduce_pin.py`) pins the model against the server deciders it reproduces.

**Deterministic vs. intentionally free** — the model draws this line *explicitly* (INV-ENT-PURE, module doc `:23-31`): `decide_admit` deterministically decides the **policy** — order, cap, unlimited, multiplier — and emits a per-group ordered *plan*; it is "deliberately NOT the authority for per-group sufficiency *under concurrency*: whether a balance group actually pays depends on an atomic DB compare-and-set that can lose a race." The IO shell (`reserve_with_draw_order`) consumes the plan and executes the atomic reserves. Policy is modeled; race outcomes are left to the machinery built for them.

---

## #7 — Cross-service invariant model + the tier→checker derivation

**Location.** `system-models/state_machines.py` — the composed model `MODEL` (7 SMs + 4 seams + **86 `ConstraintBlock` invariants** + 4 `ProtocolTrace`s at this commit; the talk's "87" was the census at talk time — one has since retired with the GKE autoscaler, per `:940-943` and `:1401`). Executed at HEAD: tier distribution **64 LINEAR_PROPERTY / 20 SAFETY_BFS / 2 LIVENESS_TLC; 22 HAIRY**.

**The invariant record** (`:442-468`, abridged): `ConstraintBlock(inv_id, description, participant_lanes, coord_primitive, temporal_form, verification_tier, hairy, verify_refs, satisfy_refs)` — where `verification_tier` + `hairy` are "DERIVED (§2a) ... NOT hand-typed"; the constructor `_make_invariant` (`:611-642`) computes them, and the S-1 / rule-#57 lints assert the stored value equals the derivation, so a hand-edit that lies is caught.

**The derivation — actual code, not description** (`:520-559`):

```python
def derive_verification_tier(
    *, participant_lanes: tuple[str, ...], coord_primitive: CoordPrimitive,
    temporal_operator: TemporalOperator,
) -> tuple[VerificationTier, bool]:
    """Derive ``(verification_tier, hairy)`` from the HAIRY test (§2a rule #57).

    HAIRY iff BOTH:
      - (H1) ≥2 participant lanes touch the same seam/coordination point, AND
      - (H2) the invariant references a race-shaped ``CoordPrimitive``
        (anything but ``NONE``).

    Tier routing (tier-aware mandate, not a binary):
      - HAIRY safety   → ``SAFETY_BFS``      (exhaustive-BFS simworld MANDATORY)
      - HAIRY liveness → ``LIVENESS_TLC``    (TLC/``.tla`` target MANDATORY)
      - LINEAR         → ``LINEAR_PROPERTY`` (property test MANDATORY)

    **§2a load-bearing move:** the liveness-vs-safety decision reads ONLY the
    ``temporal_operator`` shape — the SAME ``[]`` / ``~>`` symbol that appears in
    the ``.tla`` — never a separable ``is_liveness`` bool (deleted). ...
    """
    h1 = len(participant_lanes) >= 2
    h2 = coord_primitive is not CoordPrimitive.NONE
    hairy = h1 and h2
    if not hairy:
        return VerificationTier.LINEAR_PROPERTY, False
    if _is_liveness_operator(temporal_operator):
        return VerificationTier.LIVENESS_TLC, True
    return VerificationTier.SAFETY_BFS, True
```

The two typed inputs are themselves models: `CoordPrimitive` (`:180-250`) is a closed enum of race-shaped coordination primitives (`SQL_CAS`, `EPOCH_FENCE`, `ATOMIC_CLAIM`, `STALE_READ_HEARTBEAT`, `LUA_ATOMIC`, `FILE_FLOCK`, ..., `NONE`), each member's comment recording why it is a *distinct* race shape; `TemporalOperator` (`:308-322`) adopts TLA+ syntax verbatim (`[]P` / `[]<>P` / `P~>Q`) — "mislabeling now requires writing the wrong operator, a visible + lint-checkable act, not a silent bool desync."

**Representative invariants across all three tiers** (native form):

*(a) SAFETY_BFS — INV-1, the atomic claim (`:948-979`, abridged):*
```python
_make_invariant(
    inv_id="INV-1",
    description="Queue claim atomicity — claim+move-to-remediating is one atomic op.",
    participant_lanes=("job-introducer", "worker"),               # H1: 2 lanes
    coord_primitive=CoordPrimitive.ATOMIC_CLAIM,                  # H2: race-shaped
    temporal_form=TemporalForm(TemporalOperator.ALWAYS, "NoLoss /\\ AtMostOneClaimer", ""),
    verify_refs=(
        VerifyRef(VerifyKind.SIMWORLD, "web/test_simworld/test_inv1_atomic_claim.py",
                  "test_inv1_single_popper_no_loss_no_dup"),
        VerifyRef(VerifyKind.PROPERTY, "web/test_dispatch_atomic_zpopmin_property.py", ""),
    ),
    satisfy_refs=(
        SatisfyRef("web/worker.py", "_claim_and_process_chunk",
                   "The chunk compare-and-set (expected_status=STATUS_QUEUED→STATUS_REMEDIATING) "
                   "+ Cloud Tasks lease/ack IS the runtime enforcement of claim atomicity."),
    ),
)
```
*Why not local:* the introducer publishes and the worker claims across the dispatch seam — no single process can observe "neither queued nor in-flight." H1∧H2 with `[]P` derives SAFETY_BFS → an exhaustive-BFS simworld checker over crash-point + two-claimer interleavings is MANDATORY.

*(b) LINEAR_PROPERTY — INV-2, size-stratified fairness (`:981-1001`):* one lane (`("job-introducer",)` → H1 false), `CoordPrimitive.NONE` — a deterministic classifier, so the derivation returns LINEAR_PROPERTY and the mandate is a property test (`test_inv2_classify_size_boundary_determinism`). Note also INV-RC-5's recorded subtlety (`:213-225`): it references the race-shaped `LUA_ATOMIC` primitive (H2 true) yet stays LINEAR **only** because it declares a single publisher lane (H1 false) — "IF a future recovery-path publish ever races the introducer for one parent (H1≥2), the tier AUTO-re-derives to SAFETY_BFS."

*(c) LIVENESS_TLC — INV-18, eventual termination (`:1413-1459`, abridged):*
```python
_make_invariant(
    inv_id="INV-18",
    description="Async-cutover eventual termination — under min=0 + at-least-once "
                "PUSH (delivery may be LOST) ... every SUBMITTED job EVENTUALLY "
                "reaches a terminal state; the Cloud Scheduler sweep-cron is the "
                "load-bearing recovery driver.",
    participant_lanes=("job-completer", "sweep-cron"),            # H1: 2 lanes
    coord_primitive=CoordPrimitive.STALE_READ_HEARTBEAT,          # H2: race-shaped
    temporal_form=TemporalForm(TemporalOperator.LEADS_TO,         # ~> routes liveness
                               "Submitted ~> Terminal", "LIVE_EventualTerminal"),
    verify_refs=(VerifyRef(VerifyKind.TLA_TLC, "spec/INV18AsyncTermination.tla", ""),),
    satisfy_refs=(SatisfyRef("web/job_completer.py", "_recover_orphaned_jobs", "..."),),
)
```
*Why not local, and why TLC:* "No finite-trace BFS harness can falsify it — only TLC's liveness engine can" (`:1404-1407`). The `.tla` spec carries a falsifiability toggle (`SweepCronOn=FALSE`) whose TLC run finds a *genuine* counterexample — a lost push strands the job forever without the sweep-cron — proving the recovery driver is load-bearing. A drift lint (`lint-tla-property-matches-model.py`) asserts the `.tla`'s `LIVE_EventualTerminal == Submitted ~> Terminal` line EQUALS the line generated from the model's `temporal_form` (`temporal_form_to_tla_property`, `:580-608`), so the spec cannot diverge from the model.

**The tier→checker mandate — enforcement code** (`tools/lint/lint-invariant-verification-tier.py`, BLOCKING):

```python
_DEFAULT_TIER_KIND_MAP: dict[str, str] = {          # :226
    "SAFETY_BFS": "SIMWORLD",
    "LIVENESS_TLC": "TLA_TLC",
    "LINEAR_PROPERTY": "PROPERTY",
    "STRUCTURAL_LINT": "LINT",
    "SPEC_DERIVED": "DOC_DERIVED",
    "TRACE_QUERY": "TRACE_QUERY",
}
_KIND_PATH_SUFFIX: dict[str, str] = {"TRACE_QUERY": "_trace_query.py"}   # :249

def required_kind_for_tier(tier_value, tier_values, tier_kind_map=None):  # :254
    """Map a ``VerificationTier`` value to the ``VerifyKind`` value it MANDATES. ..."""
    mapping = tier_kind_map if tier_kind_map is not None else _DEFAULT_TIER_KIND_MAP
    return mapping.get(tier_value)

def check_invariant(inv, tier_values, tier_kind_map=None):                # :290
    # ... an invariant whose verify_refs contain NO ref of the required kind
    # whose path RESOLVES on disk (and, for suffix-mandated kinds, matches the
    # filename convention) is a finding.
```

The map's totality over the live 6-member `VerificationTier` enum is itself asserted by lookup, not snapshot (`test_tier_kind_map_total_over_enum`; rule #42). Three additional tiers (`STRUCTURAL_LINT` / `SPEC_DERIVED` / `TRACE_QUERY`, `VerificationTier` at `:253-287`) are *declared* rather than derived — the HAIRY router never returns them, so adding one cannot flip any existing derivation (`:546-550`).

**The join, end to end:** an author states three *facts* (lanes, coordination primitive, temporal shape) → `derive_verification_tier` computes the obligation → the BLOCKING lint resolves the obligation to an on-disk checker of the mandated kind → a missing/moved/wrong-kind checker is a build-stopping finding. Verification machinery is *derived from* represented properties, which is the move the talk demonstrates.

---

## #8 — Quantitative/budget model: worker peak-RSS sizing

**Location.** `system-models/worker_rss_sizing_model.py` (`MODEL_FORM="BUDGET"`). It answers "how much memory must the `worker-chunkless` Cloud Run service be provisioned with?" — a consequential envelope: under-provisioning OOM-kills real remediation jobs; the model is the graduation Epic's *hard requirement*.

**The authoritative model and units** (module doc `:16-29`; all quantities MiB):

```
P_predicted  =  os_image_base                                 [MEASURED CONST]
             +  dotnet_runtime_base                           [MEASURED CONST]
             +  streaming_bound (INV-LM-CEIL / INV-BSB)       [BOUNDED CONST — payload-flat]
             +  ( bytes_per_call × resident_calls )           [VARIABLE / PARAMETERIZED LOAD]

reserve      =  max( gc_operational_headroom ,                [POLICY FLOOR — GC working set]
                     margin_pct × P_predicted )               [POLICY %, margin_pct = 0.30]

M_pred       =  P_predicted + reserve                         [the required provisioning floor]
```

**How quantities compose** — the interesting term is the GenAI one (`:31-42`): within a job, call *ordering* is serial but a batch holds `batch_size` responses concurrently and the coordinator fans `ceil(frontier_width / batch_size)` batches across dispatch width `P_dispatch`, so `resident_calls = min(batch_size × concurrent_in_flight, frontier_width)` with `concurrent_in_flight = min(ceil(frontier_width / batch_size), P_dispatch)`. `bytes_per_call` is *request-inclusive* — the empirical multi-GiB peak was request-side dominated (resident base64 images). Crucially, `frontier_width` is **not re-derived**: it is looked up from the sibling critical-path model (`chunkless_critical_path_model.CriticalPathProfile.peak_frontier_width`) — one authoritative source per quantity, models joined by reference.

**Core function** (`:422-462`, abridged):

```python
def predict_peak_rss(payload, load, constants=None, margin_pct=MARGIN_PCT, scratch=None) -> RssPrediction:
    consts = constants if constants is not None else default_rss_model_constants()
    base = consts.base_constants_mib()
    genai = _genai_load_mib(payload, load)
    scratch_mib = scratch.scratch_mib() if scratch is not None else 0   # E-1: Cloud Run's
    p_predicted = base + genai + scratch_mib    # writable FS is tmpfs — scratch counts too
    margin_component = math.ceil(margin_pct * p_predicted)
    reserve = max(consts.gc_operational_headroom.value, margin_component)
    m_pred = p_predicted + reserve
    return RssPrediction(..., m_pred_mib=m_pred, ...)   # JSON-serializable breakdown (rule #32)
```

**Thresholds and invariants** (stable IDs, module doc `:74-80`): **INV-RSS-CEILING** `M_pred ≤ ceiling` (`fits_ceiling` `:467`); **INV-RSS-GC-HEADROOM** holds by construction (the `max(...)` floor); **INV-RSS-CONSERVATIVE** `measured ≤ P_predicted` (`validate_conservative` `:561`) — the model must *upper-bound reality*, and the measured side is disciplined: it consumes a container-cgroup `memory.peak` reading and **refuses** a process-scope `ru_maxrss` reading (`PartialMeasurementError`) because `RUSAGE_SELF` "structurally cannot see the C# `ada-tool` CLI subprocess where the .NET resident set lives" — a partial measurement is a finding, not a full-footprint claim. Every scalar constant is a `CalibrationCell` carrying MEASURED-vs-ESTIMATED provenance.

**Consumers:** `web/chunking/chunkless_coordinator.py` (production), `tools/lint/lint-chunkless-dial-coherence.py` (dial coherence against the model), the staging cgroup sweep (plugs measured numbers into `validate_conservative`).

**One actual engineering decision made from it:** `derive_memory_tier_mib` (`:472`) snaps `M_pred` up to the smallest standard Cloud Run `--memory` tier — the provisioning flag is *derived from the model*, and per the graduation criteria a `measured > P_predicted` breach "means the model missed a term and BLOCKS graduation for that format." The memory tier is not a guess anyone tunes; it is a model output with a falsifier.

---

## #9 — Provenance/evidence model: the mutator attribution registry

**Location.** The strongest "what happened, and what evidence do we have?" model is the per-mutator attribution substrate: `backend/src/AdaTool.PdfModel/Stamp/MutatorStampHelper.cs:44` (the sole write seam) → `backend/src/AdaTool.PdfModel/Readers/PdfAttributionRegistry.cs:50` (the registry embedded **inside the output PDF**, under the Catalog key `/AdaToolAttribution`), with `AdaTool.OpenXmlCommon/Attribution/OoxmlAttributionRegistry.cs` as the OOXML analogue.

**Evidence entities** — the per-entry schema, from the registry's typed key constants (`PdfAttributionRegistry.cs:82-108`):

```csharp
internal static readonly PdfName CatalogKey      = new("AdaToolAttribution");
private  static readonly PdfName MutatorKey      = new("Mutator");     // typed-mutator class
private  static readonly PdfName VerbKey         = new("Verb");        // closed mutator-verb vocabulary
private  static readonly PdfName PassKey         = new("Pass");        // logical remediation pass
private  static readonly PdfName RunIdKey        = new("RunId");       // run correlation id
private  static readonly PdfName ActionKey       = new("Action");      // MODIFY / INSERT / TAG
private  static readonly PdfName CallsiteKey     = new("Callsite");    // CallerFilePath:CallerLineNumber
private  static readonly PdfName TimestampKey    = new("Timestamp");
private  static readonly PdfName BuildInfoKey    = new("BuildInfo");
private  static readonly PdfName TargetKindKey   = new("TargetKind");  // StructElem / ImageXObject / Annotation / Doc
private  static readonly PdfName TargetRefKey    = new("TargetRef");   // the mutated object's identity
private  static readonly PdfName ScopeIdKey      = new("ScopeId");     // collapses N constituents → 1 visible row
private  static readonly PdfName PayloadKindKey  = new("PayloadKind"); // typed payloads (e.g. "editor-op")
```

**The write seam** (`MutatorStampHelper.cs:64-126`, abridged): every PDF mutator calls one helper, which routes by target type and visibility; `callerFile`/`callerLine` are compiler-injected (`[CallerFilePath]`/`[CallerLineNumber]`), so the callsite evidence cannot be faked or forgotten:

```csharp
public static void WriteStamp(SimpleLogger? logger, string passName, string mutatorName,
    string verb, AdaToolStampAction action, AdaToolStampVisibility visibility,
    PdfStructElem target, [CallerFilePath] string callerFile = "", [CallerLineNumber] int callerLine = 0)
{
    if (visibility == AdaToolStampVisibility.Debug) {
        PdfAttributionRegistry.AppendEntry(pdfDoc, mutator: mutatorName, verb: verb,
            passName: passName, action: action, targetKind: ResolveTargetKind(target),
            targetRef: ResolveTargetRef(target), callerFile: callerFile,
            callerLine: callerLine, scopeId: AttributionScope.Current?.ScopeId);
        ...
    }
    // Preserved-visibility (user-visible passes) writes an embedded /A-array stamp instead.
}
```

**Identifiers and relations:** entries are keyed to their *target* (`TargetKind` + `TargetRef` — the mutated PDF object), correlated across a run (`RunId`), grouped causally (`ScopeId` collapses N constituent mutations into one customer-visible row), and temporally ordered (`Timestamp`). The `Verb` value is drawn from the closed mutator-verb vocabulary of the Primitives layer, joining each evidence row to the bounded repair vocabulary.

**Consumers:** the CLI `derive-changelog` (derives the user-facing ChangeLog JSON *from the embedded stamp registry* — the changelog is computed from evidence, not from a parallel log), `strip-attribution` (removes debug attribution before delivery), and — closing the loop — the **F10 wiring lint** `tools/lint/lint-mutator-stamp-wiring.py` (BLOCKING): "every mutator verb in the Office Model Primitives layer must call `OoxmlAttributionRegistry.TryAppendEntryForElement` or `AppendEntry` before returning" (`:5-16`), with a justified-`noqa` escape for cannot-stamp sites. Evidence emission is *structurally mandatory*, not best-effort.

**How this differs from ordinary logging, concretely:** a log line about a mutation lives in a log stream that is disconnected from the artifact, unsampled at best, gone at worst. Here the evidence (a) travels **inside the shipped artifact**, so any output PDF in the wild is self-explaining; (b) is keyed to the mutated object, so "which pass inserted this `Figure` tag?" is a lookup, not a log-forensics session; (c) has a completeness *guarantee* (the F10 lint) — so the engineering claim "every inserted artifact is stamped, therefore every remediation is explainable and reversible" (the product's auditable-trust commitment) is *evaluable*: `derive-changelog` on any output either accounts for every mutation or exposes a wiring gap. No log-based design supports that claim.

---

## #10 — Registry/schema model: the numbered-rule registry

**Location.** `system-models/claude_md_rules.py` (`MODEL_KIND="AGENT_META"`, `MODEL_FORM="REGISTRY"` `:52-53`). REGISTRY is the largest MODEL_FORM category (50 of 130); this one is selected because it is unambiguously an *engineering model of the governance layer itself* — the join between prose rules, the code they govern, and the lints that enforce them — and because it is consumed by two BLOCKING lints on every commit.

**Universe enumerated:** the numbered development rules (`#1–#58`, including sub-rules `11a`/`29a`) of the project's governing document. The registry IS the source of truth for rule metadata after extraction (module doc `:15-18`: "Do not re-add `<!-- rule-meta: -->` blocks to CLAUDE.md — edit here instead"); it preserves even the historical insertion-order quirks so drift stays detectable (`:36-40`).

**Entry semantics** — representative rows (`:186-201`):

```python
"15": {
    "title": "All PDF I/O goes through PdfModel — no raw iText constructors outside PdfModel",
    "component_tags": ["pdf-model", "pdf-passes"],
    "applies_to": ["backend/src/**"],
    "linted_by": ["tools/lint/lint-banned-apis.py"],
},
"16": {
    "title": "Office remediation goes through Office Model, not raw DocumentFormat.OpenXml",
    "component_tags": ["slides-model", "docs-model", "sheets-model", "openxml-common", "checking"],
    "applies_to": ["backend/src/AdaTool.SlidesModel/**", "backend/src/AdaTool.DocsModel/**", ...],
    "linted_by": ["tools/lint/lint-openxml-direct-access.py", ...],
},
```

Each entry carries four semantic fields: `title` (the rule's crisp statement), `component_tags` (join key into the #3 zone topology — which zones the rule governs), `applies_to` (path globs — the rule's mechanical scope), and `linted_by` (repo-relative paths to the enforcing lints — the rule's *teeth*). The registry declares its own verification (`:60-64`):

```python
VERIFIED_BY: tuple[str, ...] = (
    "tools/lint/lint-claude-md-rule-meta-coverage.py",   # C1/C2: RULES keys <-> CLAUDE.md numbered rules
    "tools/lint/lint-claude-md-rule-meta-conformance.py", # per-entry field conformance
)
```

**Invalid states prevented/exposed:** (a) a numbered rule with no registry entry, or a registry entry with no rule — the coverage lint enforces **bidirectional** coverage, so doc and registry cannot silently diverge; (b) a rule with an empty `linted_by` is *visible* as guidance-without-teeth — the "soft vs hard control" axis becomes a queryable column rather than tribal knowledge; (c) malformed entries (missing fields, bad component tags) fail the conformance lint. The registry even records its own found defects as data: rule #35's original meta block had a mismatched id, corrected here with a note; rule #41 lacks a block "and the coverage lint will flag it until a block is added" (`:41-44`).

**Consumers:** the two BLOCKING lints above (every commit), and `repo-query` (rules are queryable without grepping a 1,300-line governing document — which was the founding motivation: moving 42 metadata blocks out of the boot-context-critical doc into this sidecar, `:10-13`).

**Why a registry beats rediscovery from implementation:** the facts it holds are *joins* that exist nowhere else in one place — "which lint enforces rule #16, over which paths, in which zones?" Reconstructing that from implementation means reading ~58 prose rules, grepping ~100+ lints for intent, and guessing scope from lint internals — per agent, per session, with per-derivation error. As a registry it is one lookup, and — decisively — it is *held* by the coverage lint: the reconstruction can rot silently; the registry cannot. That is the general argument for the repo's 50 registries in one sentence: a registry converts N repeated, error-prone derivations into one enumerated, lint-guarded fact table.

---

*End of R1-response-A. The three synthesis queries (query.md lines 30/34/40) are answered in R1-response-B.*
