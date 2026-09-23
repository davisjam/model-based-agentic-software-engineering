# R1-response-B — DocAble model synthesis (reduction / joins / model-beats-implementation)
**Round:** 1 (response B of B)  **From:** DocAble repo owner (Fable evidence-extraction pass, orchestrated by Claude Opus)  **To:** Chapter-2 reviewer
**Responds-to:** query.md synthesis queries (§30 reduction, §34 joins, §40 model-vs-implementation)  **Model:** Fable  **Date:** 2026-09-22  **Repo-commit:** 3baabd775d  **Builds-on:** R1-response-A-inventory-260922.md

All `path:line` cites re-verified against the live repo at `3baabd775d` for this response
(same trust-nothing bar as Run A; two of Run A's worker cites are corrected below —
`web/worker.py:2536`/`:3032`, not `:2537`/`:3033`). Model numbering `A#N` refers to
Run A's inventory rows.

---

## §30 — Purposeful reduction: four maximally different models

The four chosen, and the axes on which they are maximally different:

| Model | KIND / FORM | Representation | Relationship to reality |
|---|---|---|---|
| **R1. Chunk lifecycle SM** (A#2) — `web/jobtypes/statemachine.py:167-247` | PRODUCT / STATE_MACHINE | Executable Python: Enum + transition dict + terminal frozenset | *Is* the enforcement — an illegal transition raises at runtime |
| **R2. Component-zone topology** (A#3) — `system-models/components.py` | AGENT_META / TOPOLOGY | ~6,400-line declarative tuple of frozen dataclass records | Territory-map consumed by tooling (audits, LoC, import lints) |
| **R3. Worker peak-RSS budget** (A#8) — `system-models/worker_rss_sizing_model.py` | PRODUCT / BUDGET | Closed-form arithmetic + calibration constants with provenance | Falsifiable prediction, validated against cgroup `memory.peak` |
| **R4. Mutator attribution registry** (A#9) — `MutatorStampHelper.cs:44` + `PdfAttributionRegistry.cs:50` | PRODUCT / REGISTRY (provenance) | C# — a PDF dictionary embedded *inside the shipped artifact* | Evidence that travels with the product it describes |

Behavior-over-time vs. static structure vs. quantity vs. evidence; enforced-at-runtime
vs. read-by-tooling vs. falsified-by-measurement vs. shipped-in-artifact; three Python
forms and one C#; three PRODUCT and one AGENT_META. No two share a form, a consumption
mode, or a question genre.

### R1 — Chunk lifecycle state machine (`web/jobtypes/statemachine.py:167-247`)

**(1) What engineering question caused it to exist?** "Which chunk-state writes are
*legal*?" — asked because the worker fleet's async lifecycle previously lived as
scattered status-string writes across worker code, where a crash/cancel/preemption path
could write any state after any other. The repo's architecture rule ("Explicit state
machines for async job lifecycles," CLAUDE.md Architecture rules, → A.5) is the direct
cause: scattered counter/status increments were the failure class.

**(2) What distinctions does it preserve?** Exactly three: the state vocabulary (11
named states, `ChunkState` at `:167`), the legality relation (which state may follow
which, `CHUNK_TRANSITIONS` at `:211`), and terminality (`CHUNK_TERMINAL_STATES` at
`:240`). It also preserves *distinctions between kinds of ending*: `FAILED → {IDLE}`
only (failure never requeues — the lint-backed doctrine), `REQUEUING` reachable only
from `PROCESSING` (the sole sanctioned preemption requeue), and `BATON_HANDOFF`
reachable only from `UPLOADING` — the durable-before-terminal guard INV-BAT-4 is *an
absent edge*, not a code check: there is deliberately no `PROCESSING → BATON_HANDOFF`
shortcut and no `FAILED → BATON_HANDOFF` edge (comments at `:224-227`).

**(3) What implementation details does it deliberately erase?** Everything about *how*
a transition happens: the Redis compare-and-set that implements a claim, the Cloud Tasks
lease/ack, download/upload byte streams, heartbeat renewal, retry timing, logging,
progress-percent writes, the 3,975-line worker (`web/worker.py`) that drives it. Also
*why* a particular chunk transitions (job content, GenAI outcomes) and *when* (all
durations). The model has no clock, no I/O, no data plane — `web/jobtypes/` is a
Layer-0 zero-I/O module by construction.

**(4) What consumes it?** Production: `web/worker.py:2536` and `:3032` construct
`JobStateMachine(..., CHUNK_TRANSITIONS, ..., terminal_states=CHUNK_TERMINAL_STATES)`;
an illegal transition raises `ValueError` (`:628`). `web/pipeline.py:126` re-exports it
as the coordinator seam. The composed cross-service model looks it up by reference
(`system-models/state_machines.py:734-741`, `_SM_CHUNK` via
`_states_of("ChunkState")` / `_transitions_of("CHUNK_TRANSITIONS")` — rule #42, no
snapshot copy). Checkers: driving-condition suite, two property tests, a DDT pin, and
the simworld BFS harnesses that compose it with the completer/introducer lanes.

**(5) What would have to be reconstructed without it?** The legality relation itself —
today recoverable only by reading every status-write site in `web/worker.py` (3,975
lines) plus the cancel, reaper, and preemption paths, and *inferring* which
orderings the code happens to permit. Concretely: an agent adding a baton-style feature
would have to re-derive "may a failure record a partial-success milestone?" from
scattered code (answer: no — INV-BAT-7), where today the absent edge answers in one
table lookup and the runtime raises if the agent guesses wrong.

### R2 — Component-zone topology (`system-models/components.py`)

**(1) What engineering question caused it to exist?** "What zones exist, which files
belong to whom, and what may import what?" — forced by the agent-fleet operating model:
a ~280-KLOC codebase operated by context-bounded agents needs a partition that tools
can dispatch over (per-zone audit sweeps), account over (LoC), and police (import
boundaries). No agent can hold the tree; the topology is the map they operate through.

**(2) What distinctions does it preserve?** Zone identity and kind (`leaf` — disjoint
ownership unit; `group` — cross-zone audit lens; `meta` — accounting bucket; module doc
`:27-50`); file→zone membership including glob-partitioning of *shared* directories by
literal-prefix specificity so several leaves split one root without moving files
(`:269-297`); zone→docs pointers; zone→deployment artifacts; and the declared static
import boundary per zone (`import_allowed_components`, `Component` dataclass at
`:238`). At this commit: 103 leaves, 109 audit zones (executed live).

**(3) What does it deliberately erase?** Everything dynamic: call graphs, runtime
dataflow, API shapes, deployment wiring — the module doc points at the orthogonal
Layer-3 models for those (`:79`). It also erases file *content* entirely: a zone is
membership + boundary + pointers, nothing about what the code does. And it erases
history (zones retire silently; the gke-migration retirement note at `:3388-3393` is
the only trace).

**(4) What consumes it?** `tools/agents/run-agent-audits.py` (per-zone agent dispatch
via tag matching), `run-cloc` (LoC partition, globs resolved at report time so nothing
is double-counted), `lint-component-import-boundaries.py` (every import checked against
the declared set), the overlap/coverage lints (`lint-components-overlap-exclude.py`,
`lint-components-py-covers-every-code-surface.py`), and — see Join 2 group below —
the rule-registry conformance lint validates governance-rule `component_tags` against
this model's name universe.

**(5) What would have to be reconstructed without it?** The partition itself, per
agent, per session: "which files are mine, which docs do I read first, whom may I
import?" — each agent re-deriving ownership from directory naming and convention, with
per-derivation error, and no mechanical detection of two zones silently claiming the
same file ("Two leaves MUST NOT claim the same file," `:294-296`) or of an
architecture-violating import. The audit sweep and LoC accounting would have no stable
unit at all.

### R3 — Worker peak-RSS budget (`system-models/worker_rss_sizing_model.py`)

**(1) What engineering question caused it to exist?** "How much memory must the
`worker-chunkless` Cloud Run service be provisioned with?" — consequential because
under-provisioning OOM-kills real remediation jobs mid-flight and over-provisioning is
paid per-instance forever. The chunkless graduation Epic made a *predicted-and-validated*
envelope a hard requirement: guessing a `--memory` flag was the anti-pattern.

**(2) What distinctions does it preserve?** The additive structure of peak memory and
the *epistemic status of every term* (module doc `:16-29`): measured constants
(os/dotnet base), a bounded constant (streaming bound), a parameterized load term
(`bytes_per_call × resident_calls`, with `resident_calls` composed from batch size ×
in-flight batches, `:31-46`), and a policy reserve (`max(gc_headroom, 30% margin)`).
Every scalar is a `CalibrationCell` carrying MEASURED-vs-ESTIMATED provenance. Units are
explicit (MiB). Crucially it preserves *where each quantity is owned*: `frontier_width`
is not re-derived but referenced from the sibling critical-path model
(`chunkless_critical_path_model.CriticalPathProfile.peak_frontier_width`, doc `:44-46`).

**(3) What does it deliberately erase?** The allocator. No object graphs, no GC
behavior over time, no per-request RSS traces, no .NET heap internals, no timeline at
all — peak is modeled as a *sum of bounds*, not a simulation. It also erases workload
content (which PDFs, which images): the load term keeps only the two numbers that move
the peak (bytes per resident call, count of resident calls). And it deliberately
*refuses* information of the wrong scope: `validate_conservative` (`:561`) rejects a
process-scope `ru_maxrss` reading (`PartialMeasurementError`) because it cannot see the
C# subprocess — a measurement that would *add* data but corrupt the answer.

**(4) What consumes it?** `web/chunking/chunkless_coordinator.py` (production),
`tools/lint/lint-chunkless-dial-coherence.py` (dial coherence), the staging cgroup
sweep (feeds measured `memory.peak` into `validate_conservative`), and
`derive_memory_tier_mib` (`:472`), which snaps `M_pred` (`predict_peak_rss`, `:422`) to
the smallest standard Cloud Run `--memory` tier — the provisioning flag is a model
output with a falsifier (measured > predicted BLOCKS graduation).

**(5) What would have to be reconstructed without it?** The provisioning decision
degrades to load-test-and-pad: run big fixtures, watch RSS, add a vibes margin — with
no decomposition to tell you *which term* grew when a regression appears, no way to
predict the effect of a batch-size dial change without re-running the sweep, and no
principled line between "model missed a term" (a real defect) and "workload got
bigger" (a parameter change). The composition law — how batching and dispatch width
multiply into resident calls — would live in nobody's head reliably.

### R4 — Mutator attribution registry (`MutatorStampHelper.cs:44` + `PdfAttributionRegistry.cs:50`)

**(1) What engineering question caused it to exist?** "Which pass/mutator/verb made
*this* mutation in *this* shipped document?" — the product's auditable-trust commitment
(every remediation explainable and reversible) requires the answer to be available for
any output PDF in the wild, months later, with no access to the producing run's logs.

**(2) What distinctions does it preserve?** Per mutation: agent identity (Mutator,
Verb from the closed verb vocabulary, Pass), target identity (TargetKind + TargetRef —
the mutated PDF object), causal grouping (ScopeId collapses N constituent mutations
into one customer-visible row), run correlation (RunId), time (Timestamp), and code
provenance (Callsite via compiler-injected `[CallerFilePath]`/`[CallerLineNumber]` —
unforgeable and unforgettable). Typed key constants at `PdfAttributionRegistry.cs:82-108`;
registry root at the Catalog key `/AdaToolAttribution` (`:82`).

**(3) What does it deliberately erase?** The mutation's *computation*: the GenAI
prompt and response that produced an alt text, the heuristics consulted, the iText
object surgery performed, intermediate states, everything that happened between "verb
invoked" and "object changed." Also erased: all mutations' *content semantics* — the
registry records that `Figure`-tagging happened at a target, not whether the alt text
is good (that is the checker layer's question). It is an evidence index, not a trace.

**(4) What consumes it?** `ada-tool derive-changelog` (the user-facing ChangeLog is
*computed from the embedded evidence*, not from a parallel log), `strip-attribution`
(removes debug-visibility entries before delivery), and the BLOCKING F10 wiring lint
`lint-mutator-stamp-wiring.py` — every mutator verb in the Primitives layers MUST call
stamp wiring, so evidence emission is structurally mandatory, not best-effort.

**(5) What would have to be reconstructed without it?** Log forensics per question:
correlate a customer's PDF back to a run id, hope the run's logs were retained and
verbose enough, then map log lines to PDF objects by guesswork — for *every* "why does
this document have this tag?" support question. Reversibility would be unimplementable
(no per-target record of what was inserted), and the completeness claim — "every
inserted artifact is stamped" — would be unevaluable, since only a structural registry
plus a wiring lint can make absence of evidence a detectable defect.

**The §30 pattern across all four.** Each model preserves exactly the distinctions its
question needs — legality, membership, additive bounds, evidence identity — and erases
the dimension that dominates the implementation's bulk (mechanism, content, timeline,
computation). In all four cases the erasure is *enforced*, not aspirational: the SM
raises, the topology lints, the budget refuses out-of-scope measurements, the registry
is wired by a BLOCKING lint.

---

## §34 — Two model joins

### Join 1 — Invariant facts ⋈ tier decision table ⋈ checker corpus → derived verification obligations

**The question no single model can answer:** *"Is every concurrency-hazardous
cross-service property in the system covered by a checker strong enough for its hazard
class — and which properties are currently unprotected?"* The invariant model alone
knows facts about properties but not obligations; the tier taxonomy alone is an
abstract decision table; the checker corpus (test files on disk) does not know what it
is supposed to cover. Only the three joined can say "INV-1 requires an exhaustive-BFS
simworld checker and has one at this path" — or fail the build when it doesn't.

**Source models and their keys.**

- *Model 1:* the composed cross-service model — 86 `ConstraintBlock` records in
  `system-models/state_machines.py` (dataclass at `:443`), each carrying three declared
  **facts**: `participant_lanes`, `coord_primitive` (closed enum of race shapes,
  `:180-250`), `temporal_form` (TLA+ operator syntax, `:308-322`) — plus
  `verify_refs: tuple[VerifyRef, ...]` where each `VerifyRef` has a `kind` (VerifyKind)
  and a repo-relative `path`. Key: `inv_id`.
- *Model 2:* the `VerificationTier` × `VerifyKind` taxonomy — tier values derived per
  invariant; kinds name checker technologies (SIMWORLD, TLA_TLC, PROPERTY, ...).
  Key: the tier's string value.
- *Model 3:* the checker corpus itself — files on disk under `web/test_simworld/`,
  `spec/*.tla`, property tests. Key: the path.

**Join operation, stage 1 — facts → obligation** (`state_machines.py:520-559`; the
stored tier is computed by `_make_invariant` at `:611`, never hand-typed, and the
rule-#57 lints assert stored == derived):

```python
def derive_verification_tier(
    *, participant_lanes: tuple[str, ...], coord_primitive: CoordPrimitive,
    temporal_operator: TemporalOperator,
) -> tuple[VerificationTier, bool]:
    h1 = len(participant_lanes) >= 2                      # ≥2 lanes share a seam
    h2 = coord_primitive is not CoordPrimitive.NONE       # race-shaped primitive
    hairy = h1 and h2
    if not hairy:
        return VerificationTier.LINEAR_PROPERTY, False
    if _is_liveness_operator(temporal_operator):          # reads the ~> / [] shape
        return VerificationTier.LIVENESS_TLC, True        # the .tla itself uses
    return VerificationTier.SAFETY_BFS, True
```

**Join operation, stage 2 — obligation ⋈ corpus** (the BLOCKING lint
`tools/lint/lint-invariant-verification-tier.py`; map at `:226`, resolver at `:254`,
join at `:290`):

```python
_DEFAULT_TIER_KIND_MAP: dict[str, str] = {          # tier → mandated checker KIND
    "SAFETY_BFS": "SIMWORLD", "LIVENESS_TLC": "TLA_TLC",
    "LINEAR_PROPERTY": "PROPERTY", "STRUCTURAL_LINT": "LINT",
    "SPEC_DERIVED": "DOC_DERIVED", "TRACE_QUERY": "TRACE_QUERY",
}

def check_invariant(inv, tier_values, tier_kind_map=None) -> list[str]:
    """Check ONE invariant's tier→checker mandate."""
    findings = []
    tier_value = str(getattr(getattr(inv, "verification_tier", None), "value", ...))
    required_kind = required_kind_for_tier(tier_value, tier_values, tier_kind_map)
    if required_kind is None:       # untotalled tier — itself a finding
        findings.append(f"{inv_id} (tier={tier_value}): no VerifyKind mandate ...")
        return findings
    required_suffix = _KIND_PATH_SUFFIX.get(required_kind)   # e.g. *_trace_query.py
    satisfied = False
    for ref in inv.verify_refs:                              # ⋈ against the corpus:
        if ref.kind.value != required_kind or not _path_resolves(ref.path):
            continue                                         # kind must MATCH and
        if required_suffix and not ref.path.endswith(required_suffix):
            continue                                         # path must EXIST on disk
        satisfied = True
        break
    if not satisfied:
        findings.append(f"{inv_id} (tier={tier_value}): no {required_kind} checker — "
                        "... requires a verify_refs entry of kind ... whose path "
                        "resolves on disk ...")
    return findings
```

**Authoritative model fragment being joined** (one SAFETY_BFS row,
`state_machines.py:948-979` abridged — the three facts on the left of the join, the
corpus keys on the right):

```python
_make_invariant(
    inv_id="INV-1",
    description="Queue claim atomicity — claim+move-to-remediating is one atomic op.",
    participant_lanes=("job-introducer", "worker"),          # fact H1
    coord_primitive=CoordPrimitive.ATOMIC_CLAIM,             # fact H2
    temporal_form=TemporalForm(TemporalOperator.ALWAYS, "NoLoss /\\ AtMostOneClaimer", ""),
    verify_refs=(
        VerifyRef(VerifyKind.SIMWORLD, "web/test_simworld/test_inv1_atomic_claim.py",
                  "test_inv1_single_popper_no_loss_no_dup"),  # ⟵ join target
        VerifyRef(VerifyKind.PROPERTY, "web/test_dispatch_atomic_zpopmin_property.py", ""),
    ),
    ...
)
```

**Derived information:** per invariant, `(tier, mandated_kind, satisfied?)`. At this
commit the derivation partitions the 86 invariants into 64 LINEAR_PROPERTY / 20
SAFETY_BFS / 2 LIVENESS_TLC.

**The engineering decision/check that consumes it:** the lint is BLOCKING on every
commit (rule #57). Deleting `test_inv1_atomic_claim.py`, moving it, or downgrading a
two-lane invariant's checker to a mere property test is a build-stopping finding. The
dynamics matter too: the obligation *re-derives* — INV-RC-5 (`:213-225` commentary) is
LINEAR today only because it declares a single publisher lane; if a second lane is ever
added, the tier flips to SAFETY_BFS automatically and the lint immediately demands a
BFS checker that does not exist. The join is what makes "our verification machinery
matches our concurrency hazards" a *maintained theorem* instead of a review hope.

### Join 2 — SyncEdge contract model ⋈ deploy env-wiring registry → the fleet's IAM grant plan

A genuinely different join: the first derives *verification obligations* from facts;
this one derives *cloud infrastructure configuration* from topology — the join output
is executed as `gcloud` IAM mutations at deploy time.

**The question no single model can answer:** *"Which `run.invoker` IAM bindings must
exist for the service fleet to function — and do the declared call topology, the
deployed URL wiring, and the applied cloud policy mutually cohere?"* The edge model
knows who calls whom under what auth contract but nothing about deploy-time runtime
identity; the deploy plane knows env vars and service accounts but not which edges are
IAM-gated; the cloud knows its current bindings but not which are *required*.

**Source models and their keys.**

- *Model 1:* `system-models/interservice_edges.py` — 26 `SyncEdge` records
  (`SYNC_EDGES` at `:284`; dataclass at `:217`), each `(caller, callee, callee_api,
  callee_url_env, auth, url_seam, expected_status)`. The `AuthContract` facet (`:195`)
  carries the two IAM facts with a semantic completeness predicate: an
  `IAM_GATED_HTTPS` edge MUST have `oidc_audience_is_callee_url` AND
  `invoker_grant_required` (`is_complete`, `:207-213`).
- *Model 2:* the deploy plane's env-wiring registry —
  `deploy/cloud-run/generate_manifests.py:785`, `DOWNSTREAM_URL_DEPS:
  dict[str, dict[str, str]]` mapping `caller → {env_var: callee}`, the literal every
  Cloud Run manifest's env block is generated from.
- *Join key:* the `(caller, callee_url_env, callee)` triple — `SyncEdge.callee_url_env`
  IS the env-var name in the deploy registry.

**Model fragments** (one edge and its deploy-plane counterpart — the same fact in two
representations, which is exactly what the join pins):

```python
# system-models/interservice_edges.py:284-294
SyncEdge(
    caller=ComponentName("accessibility-quality-service"),
    callee=ComponentName("genai-service"),
    callee_api=ApiEntityName("genai-service-complete"),
    callee_url_env=EnvVarName("ADA_TOOL_GENAI_SERVICE_URL"),   # ⟵ join key
    auth=_SOA_IAM_AUTH,          # IAM_GATED_HTTPS, invoker_grant_required=True
    url_seam=UrlSeam.DOWNSTREAM_URL_DEPS,
    expected_status=_SOA_STATUS_BASELINE,
)

# deploy/cloud-run/generate_manifests.py:785-790
DOWNSTREAM_URL_DEPS: dict[str, dict[str, str]] = {
    "accessibility-quality-service": {
        "ADA_TOOL_GENAI_SERVICE_URL": "genai-service",         # ⟵ join key
    },
    ...
}
```

**Join operation, stage 1 — projection + byte-parity** (`interservice_edges.py:657`):

```python
def derive_downstream_url_deps() -> dict[str, dict[str, str]]:
    """Project the SyncEdge set → the {caller: {env_var: callee}} shape of
    generate_manifests.DOWNSTREAM_URL_DEPS (design §5.1). ..."""
    out: dict[str, dict[str, str]] = {}
    for caller in sync_edge_callers():
        edge_map = {
            str(e.callee_url_env): str(e.callee)
            for e in sync_edges_for(caller)
            if e.url_seam is UrlSeam.DOWNSTREAM_URL_DEPS
        }
        if edge_map:
            out[str(caller)] = edge_map
    return out
```

pinned byte-identical by INV-ISC-X8 (`system-models/test_interservice_edges.py:41`):

```python
def test_x8_downstream_url_deps_parity_byte_identical() -> None:
    assert ise.derive_downstream_url_deps() == DOWNSTREAM_URL_DEPS
```

— the strangler-fig join: the model *derives* the live literal exactly (25 of the 26
edges across 6 callers participate; web→doc-edit is wired by a different driver and is
excluded so parity stays exact), proving the model can own the URL wiring before the
literal is retired. A companion test (`:47`) asserts the subsumption is total — no live
`(caller, env, callee)` triple is unmodeled.

**Join operation, stage 2 — edges ⋈ runtime identity → the grant plan**
(`deploy/cloud-run/deploy_cloudrun.py:728`):

```python
def downstream_invoker_grant_plan(
    env_runtime: CloudRunEnvRuntime, *, services: Iterable[str] | None = None
) -> list[DownstreamInvokerGrant]:
    """Derive the per-edge invoker grants from the DOWNSTREAM_URL_DEPS model.
    For every (caller → {env_var: callee}) edge ..., emit one grant: the caller's
    runtime SA gets run.invoker on the env-scoped callee. ... Deterministic
    (sorted by caller then callee). This is the pure test seam (no gcloud)."""
    ...
    for caller in sorted(DOWNSTREAM_URL_DEPS):
        member_sa = env_runtime.runtime_sa      # caller's runtime identity
        for callee in sorted(set(DOWNSTREAM_URL_DEPS[caller].values())):
            grants.append(DownstreamInvokerGrant(
                caller=caller, callee=callee, member_sa=member_sa,
                argv=tuple(build_grant_run_invoker_to_sa_argv(callee, member_sa, env_runtime)),
            ))
    return grants
```

**Derived information:** the complete, deduplicated set of `(member_sa, callee)`
`run.invoker` bindings the fleet requires, each with its ready-to-execute gcloud argv —
information that exists in *neither* source model: the edge model has no service
accounts; the deploy runtime has no edge semantics.

**The engineering decision that consumes it:** `_grant_downstream_invokers`
(`deploy_cloudrun.py:778+`) runs after every fleet deploy and *applies the joined
result to the cloud* — idempotently, so a manually revoked binding self-heals on the
next deploy; two callers reaching one callee collapse to one binding with all callers
recorded for the reviewer. A third leg closes the triangle: the BLOCKING parity lint
`tools/lint/lint-interservice-backstage-parity.py` (INV-ISC-X9) joins the same
`SyncEdge` set against the Backstage catalog (`system-models/services/*.yaml`) under a
deliberately *three-representation* join key (caller's `consumesApis` at API grain, OR
caller's `dependsOn` at component grain, OR the callee's `expected-callers` inbound
mirror — `has_backstage_edge`), so adding a service call without declaring it, or
declaring it without cataloguing it, is a commit-time finding. Model → manifest env
block, model → IAM policy, model → catalog: one typed edge set, three enforced
projections.

---

## §40 — Implementation vs. model, side by side: the entitlement admit decision

**The intended question:** *"May this user upload N pages of this format — and which
credit group pays?"*

**The two representations.** The model is
`system-models/entitlement_model.py:decide_admit` (`:307`) — a pure function over typed
inputs, in a 601-line module whose decision core is ~70 lines. The implementation
surface that *hosts* the same question in production is `web/upload_credit_gate.py`
(312 lines) + `web/quota_gate.py` (1,192 lines) + the `web/persistence/billing.py`
layer behind them — DB, Redis, HTTP, and concurrency included. The implementation
contains strictly more information; the model answers the question better.

**Side A — the model** (`entitlement_model.py:307-369`, abridged; `draw_order` at
`:271`, `PlanStep`/`AdmitDecision` at `:244-268`):

```python
def decide_admit(groups, format_kind, pages, *, prefer_personal=False) -> AdmitDecision:
    """THE single entitlement-policy authority ...
    Pure: no I/O, no side effects (INV-ENT-PURE / REVISE-2)."""
    credits_needed = credits_for_pages(format_kind, pages)   # PDF ×2, Office ×1
    ordered = draw_order(groups, prefer_personal=prefer_personal)
    #         ^ R1: institutional first, then personal — a STABLE partition
    steps: list[PlanStep] = []
    for grp in ordered:
        # 1. Cap gate (R3) — before admit, on EVERY candidate (unlimited included).
        if grp.cap_exceeded_by(credits_needed):
            steps.append(PlanStep(grp.group_id, StepOutcome.SKIP_CAP_EXCEEDED, 0, False)); continue
        # 2. Unlimited ⇒ admit (R2/R5) — short-circuit, no balance read.
        if grp.is_unlimited:
            steps.append(PlanStep(grp.group_id, StepOutcome.ADMIT_UNLIMITED, 0, True))
            return AdmitDecision(admit=True, credits_needed=credits_needed,
                                 drawn_group_id=grp.group_id, drawn_is_unlimited=True,
                                 plan=tuple(steps))
        # 3. Finite balance sufficiency (R4).
        if grp.credit_balance >= credits_needed:
            steps.append(PlanStep(grp.group_id, StepOutcome.ADMIT_BALANCE,
                                  grp.credit_balance, True))
            return AdmitDecision(admit=True, credits_needed=credits_needed,
                                 drawn_group_id=grp.group_id, drawn_is_unlimited=False,
                                 plan=tuple(steps))
        steps.append(PlanStep(grp.group_id, StepOutcome.SKIP_INSUFFICIENT_BALANCE,
                              grp.credit_balance, False))
    return AdmitDecision(admit=False, credits_needed=credits_needed,
                         plan=tuple(steps), reject_reason=...)
```

Four rules — draw order, cap gate, unlimited⇒admit, per-group sufficiency — plus an
ordered per-group *plan* explaining the verdict. That is the entire policy.

**Side B — the implementation** (`web/upload_credit_gate.py:180-260`, abridged to the
paragraph structure; the model call is at `:229`):

```python
format_kind = FileFormat(_format_kind_raw)                # DB: file_format_kind()
if admin_bypass: return CreditCheckResult(ok=True, ...)   # admin escape hatch
pages = _quick_page_estimate(filename, file_bytes)        # CLI page-count probe
needed = db.credits_for_pages(format_kind, pages)
if user:
    groups = db.list_user_groups(user["id"])              # DB read
    if not groups:                                        # signup-verify never fired:
        db.provision_personal_group(user["id"], ...)      #   lazy provisioning write
        groups = db.list_user_groups(user["id"])
    for grp in groups:                                    # assemble typed inputs:
        grp_id_billing = BillingGroupId(grp.id)           #   two GroupId NewTypes in play
        cap = grp.effective_cap_credits()
        used = db.get_member_mtd_credit_usage(...) if cap is not None else 0
        if grp.is_unlimited or (cap is not None and used + needed > cap):
            available = 0                                 # balance moot — don't read it
        else:
            available = billing.available_quota(grp_id_billing)  # balance − reserved
        ents.append(em.GroupEntitlement.from_bundle(...))
    decision = em.decide_admit(ents, em.CreditFormat(_format_kind_raw), pages,
                               prefer_personal=prefer_personal)   # ⟵ THE POLICY
    ...map decision → CreditCheckResult with user-facing reason strings...
else:
    # Anonymous path: cookie identity, one-time ANON_GRANT issuance (idempotent,
    # system-wide cap B-6c, Redis-outage fail-CLOSED → 503/402 mapping),
    # LOCAL-only double-guarded dev quota skip, ledger-derived cookie balance...
```

And this is only the *read* gate: the write path (`reserve_with_draw_order`) walks
`decision.plan` executing atomic DB compare-and-set reserves that can lose races;
`web/quota_gate.py` (1,192 lines) hosts the queue-side re-check.

**What the model discards — and why each loss is a feature.**

1. **All I/O and identity plumbing** (DB reads, lazy group provisioning, NewType
   bridging, cookie identity, admin bypass). The question is about *policy*, and
   policy mixed with I/O cannot be exhaustively tested or reused: because the model is
   pure, its LINEAR_PROPERTY mandate (derived by Join 1's machinery — one lane,
   `CoordPrimitive.NONE`) is dischargeable by a property test
   (`system-models/test_entitlement_model.py`), and a cross-runtime parity corpus
   (`web/test_entitlement_reproduce_pin.py`) pins the same decider against the server
   *and* the client TypeScript reimplementation. None of that is possible against
   Side B.
2. **Concurrency.** The model draws this boundary *explicitly* (INV-ENT-PURE, module
   doc `:21-30`): it decides the policy and emits a plan, and is "deliberately NOT the
   authority for per-group sufficiency *under concurrency*" — whether a group actually
   pays depends on an atomic CAS that can lose a race. Erasing the race from the model
   is what keeps the model right: it answers "who *should* pay, in what order," and
   delegates "who *did* pay" to machinery built for races.
3. **Failure and availability handling** (Redis outage fail-closed, 503/402 mapping,
   dev-env toggles). These decide whether the question can be *asked*, not what the
   answer *is*.

**The decisive nuance — information quantity was never the problem.** This exact
question was previously answered by code that had access to *all* of Side B's
information — every group row, every balance — and it answered **wrong**: the deleted
`get_credit_balances` summed the balances of non-unlimited groups into one scalar, so a
pure-unlimited institutional user projected to `0` and was paywalled in production
(RCA `docs/rca/purdue-institutional-upload-paywall-260824.md`; module doc `:15-19` and
the §E note at `:371-384`: "Its lossy `Σ credit_balance where not is_unlimited`
contract WAS the D1 prod bug"). That scalar was *also* a reduction — just an
unprincipled one that erased the load-bearing distinction (unlimited mode, draw order)
while the model's reduction erases only what the question doesn't need (I/O, races,
plumbing) and keeps a per-group ordered plan. The lesson the chapter can quote: the
model is not better because it is smaller, and the implementation was not wrong because
it was bigger — the model is better because its *choice of what to discard is the
answer to "what does this question need?"*, made once, named (INV-ENT-1..5), pinned by
a property test and a parity corpus, and guarded by a lint
(`lint-entitlement-scalar-gate-allowlist`) that bars any new hand-rolled reduction from
answering the question again. Containing less, on purpose, with the purpose enforced —
that is what makes it a model rather than a summary.

---

*End of R1-response-B. Round 1 complete (A: inventory + emissions; B: synthesis).*
