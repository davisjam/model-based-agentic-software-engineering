# R2-response-B — DocAble model-join traces, the entitlement before/after artifact, and evolution evidence

**Round:** 2 (response B)  **From:** DocAble repo owner (Fable evidence-extraction pass)  **To:** Chapter-2 reviewer
**Responds-to:** next-request.md items **4** (join traces), **5** (before/after entitlement artifact), and the **evolution-evidence addendum**
**Model:** Fable  **Date:** 2026-09-22  **Repo-commit (this response):** `621c05852a`
**R1 baseline reconciliation:** R1 was cut at `3baabd775d`, which is an ancestor of this HEAD. The delta is three merge-train squashes (`7872c752a5`, `90c7c5e842`, `c5860fc57f`, all 2026-09-22) touching ONLY `system-models/interservice_edges.py`, `tools/lint/lint-interservice-backstage-parity.py`, and its tests. Consequences for R1's numbers, verified live below: the SyncEdge projection now spans **6 callers / 28 DOWNSTREAM_URL_DEPS edges** (R1 said "25 of the 26 edges across 6 callers"); the byte-parity invariant INV-ISC-X8 still holds at HEAD (executed live, §B step 3). Every other cited file (`state_machines.py`, `entitlement_model.py`, `deploy_cloudrun.py`, `generate_manifests.py`, the tier lint, `upload_credit_gate.py`) is **byte-identical to the R1 baseline** — all R1 line numbers for those files remain valid and were re-verified here.

All `path:line` cites verified against the working tree at `621c05852a`. All "live run" blocks are actual tool output produced during this pass (read-only; no repo mutations). Nothing in this response is partial — all three items are complete, each with the requested 1–2 extras.

---

## Item 4 — Two paired model-join traces, end to end

The paired claim these two traces carry: **a model becomes load-bearing at the joins.** Trace A joins *declared invariant facts* to a *checker corpus on disk* and ends in a build-blocking admission decision; Trace B joins a *typed call-topology model* to *deploy-time runtime identity* and ends in applied cloud IAM policy. Neither terminal fact (the lint verdict; the IAM binding) exists in any single source model.

### Trace A — INV-1: declared facts → derived tier → mandated checker kind → cited checker → file-exists → blocking admission

**The trace in one table** (each row is one join hop; every field is quoted verbatim below):

| Hop | What | Carrier (file:line) | Value for INV-1 |
|---|---|---|---|
| 1 | Declared facts | `system-models/state_machines.py:948-954` (`_make_invariant` kwargs) | `participant_lanes=("job-introducer","worker")`; `coord_primitive=ATOMIC_CLAIM`; `temporal_form=(ALWAYS, "NoLoss /\ AtMostOneClaimer")` |
| 2 | Tier derivation (never hand-typed) | `state_machines.py:520-559` `derive_verification_tier`, invoked by `_make_invariant` at `:627` | H1: 2 lanes ≥ 2 ✓; H2: `ATOMIC_CLAIM is not NONE` ✓; operator `[]` is not liveness ⇒ **`SAFETY_BFS`, hairy=True** |
| 3 | Stored-vs-derived honesty | `ConstraintBlock` docstring `:447-451`; S-1 / rule-#57 lints assert stored == derived | a hand-edited tier that lies is a lint finding |
| 4 | Tier → mandated checker KIND | `tools/lint/lint-invariant-verification-tier.py:226-236` `_DEFAULT_TIER_KIND_MAP` | `"SAFETY_BFS" → "SIMWORLD"` |
| 5 | Mandate ⋈ checker corpus | same lint, `check_invariant` `:290-337` + `_path_resolves` `:283-287` | scans `verify_refs` for a ref of kind `SIMWORLD` **whose path exists on disk** |
| 6 | The cited checker, on disk | `state_machines.py:962-964` cites `web/test_simworld/test_inv1_atomic_claim.py` :: `test_inv1_single_popper_no_loss_no_dup` — file exists (16,031 bytes), function at `:207` | satisfied ✓ |
| 7 | Blocking admission decision | registration `tools/lint/lint_all/registrations/batch_e.py:6120-6125` (`blocking=True, audit_only=False`); lint declares `PRE_COMMIT_SCOPE: "full"` (`:77`); merge-train attest runs "final lint-all + unit-tier" (`tools/agents/merge_train.py:19`, `:1489`) | a missing/moved/kind-downgraded checker **stops the commit from landing** |

**Hop 1 — the declared facts, verbatim** (`system-models/state_machines.py:947-967`):

```python
_INVARIANTS: tuple[ConstraintBlock, ...] = (
    _make_invariant(
        inv_id="INV-1",
        description="Queue claim atomicity — claim+move-to-remediating is one atomic op.",
        participant_lanes=("job-introducer", "worker"),
        coord_primitive=CoordPrimitive.ATOMIC_CLAIM,
        temporal_form=TemporalForm(
            TemporalOperator.ALWAYS, "NoLoss /\\ AtMostOneClaimer", ""),
        verify_refs=(
            ...
            VerifyRef(VerifyKind.SIMWORLD,
                       "web/test_simworld/test_inv1_atomic_claim.py",
                       "test_inv1_single_popper_no_loss_no_dup"),
            VerifyRef(VerifyKind.PROPERTY,
                       "web/test_dispatch_atomic_zpopmin_property.py", ""),
        ),
```

**Hop 2 — the derivation, verbatim core** (`state_machines.py:552-559`; the docstring at `:536-540` records the load-bearing move — liveness routing reads ONLY the temporal-operator shape, the same `[]`/`~>` symbol the `.tla` uses; the old separable `is_liveness` bool was deleted):

```python
    h1 = len(participant_lanes) >= 2
    h2 = coord_primitive is not CoordPrimitive.NONE
    hairy = h1 and h2
    if not hairy:
        return VerificationTier.LINEAR_PROPERTY, False
    if _is_liveness_operator(temporal_operator):
        return VerificationTier.LIVENESS_TLC, True
    return VerificationTier.SAFETY_BFS, True
```

`_make_invariant` (`:611-639`) calls this and stores the result in the frozen `ConstraintBlock` — "Build an ConstraintBlock with a DERIVED tier (never a hand-typed literal)" (`:621`).

**Hops 4–5 — the join, verbatim** (`tools/lint/lint-invariant-verification-tier.py`):

```python
_DEFAULT_TIER_KIND_MAP: dict[str, str] = {        # :226
    "SAFETY_BFS": "SIMWORLD",
    "LIVENESS_TLC": "TLA_TLC",
    "LINEAR_PROPERTY": "PROPERTY",
    "STRUCTURAL_LINT": "LINT",
    "SPEC_DERIVED": "DOC_DERIVED",
    "TRACE_QUERY": "TRACE_QUERY",
}
```

```python
def check_invariant(inv, tier_values, tier_kind_map=None) -> list[str]:   # :290
    ...
    required_kind = required_kind_for_tier(tier_value, tier_values, tier_kind_map)
    if required_kind is None:                      # untotalled tier — itself a finding
        findings.append(f"{inv_id} (tier={tier_value}): no VerifyKind mandate ...")
        return findings
    ...
    required_suffix = _KIND_PATH_SUFFIX.get(required_kind)     # :326
    satisfied = False
    for ref in refs_iter:                                      # ⋈ against the corpus
        kind_value = str(getattr(kind_obj, "value", kind_obj))
        rel_path = str(getattr(ref, "path", ""))
        if kind_value != required_kind or not _path_resolves(rel_path):   # :332
            continue                       # kind must MATCH and path must EXIST on disk
        if required_suffix is not None and not rel_path.endswith(required_suffix):
            continue                       # …and, for convention-named kinds, match shape
        satisfied = True
        break
    if not satisfied:
        findings.append(f"{inv_id} (tier={tier_value}): no {required_kind} checker — ...")
```

**Hop 6 — the checker the join lands on** (`web/test_simworld/test_inv1_atomic_claim.py:207-216`; a Hypothesis property over the REAL introducer tick and real Lua pop):

```python
def test_inv1_single_popper_no_loss_no_dup(
    job_ids: list[str], num_pops: int
) -> None:
    """INV-1: single-popper over N seeded jobs — no loss, no duplication.

    Seeded N jobs into the queue; drives ``run_introducer_tick`` (REAL tick,
    real Lua pop) ``num_pops`` times without acking.  Asserts the XOR predicate
    holds at the end:

      (queue ∪ processing) == all_jobs   and   (queue ∩ processing) == ∅.
```

**Hop 7 — the blocking admission, verbatim registration** (`tools/lint/lint_all/registrations/batch_e.py:6120-6125`):

```python
_REGISTRY.register(
    name=LintName('invariant-verification-tier (S-5, rule #57)'),
    cmd=[sys.executable, os.path.join(_TOOLS_DIR, "lint-invariant-verification-tier.py")],
    blocking=True,
    audit_only=False,
)
```

**Live run at HEAD `621c05852a`** (this pass; exit code shown):

```
$ python3 tools/lint/lint-invariant-verification-tier.py
0 blocking finding(s); 0 audit-only finding(s)
EXIT=0
```

**Two dynamics facts that make this a *maintained theorem*, not a snapshot:**

1. *The obligation re-derives.* Because hop 2 is a function of the declared facts, adding a second participant lane to a LINEAR invariant flips its tier to `SAFETY_BFS` **automatically**, and the lint immediately demands a BFS checker that does not exist. The lint's own docstring records this ridden in anger — the demote→build→re-promote cycle (`lint-invariant-verification-tier.py:49-62`): RE-PROMOTED after serverless-first Phase 30 built the queue-bridge SAFETY_BFS checkers (INV-13/14/15); RE-DEMOTED/RE-PROMOTED for the C1 INV-P2/P4 gap; for the sidecar INV-PS-1 credit-CAS gap (`web/test_simworld/test_invps1_credit_cas.py`); and for the a11yvalidate INV-AV-6 batch-flush-race gap (`web/test_simworld/test_invav6_batch_flush_race.py`).
2. *The join is model-plural.* `discover_models()` (`:208`) discovers every `system-models/*.py` declaring the invariant surface — **40 model modules at HEAD** (executed live). Walking them exactly as the lint does (`model.invariants()`) yields **272 invariants fleet-wide**: 218 `LINEAR_PROPERTY`, 34 `SAFETY_BFS`, 3 `LIVENESS_TLC`, plus declared tiers (7 `STRUCTURAL_LINT`, 4 `CODE_STRUCTURAL`, 3 `CROSS_SERVICE_PARITY`, 3 `TRACE_QUERY`). **Reconciliation with R1:** R1's "86 invariants: 64/20/2" is the *composed cross-service model alone* (`state_machines.MODEL.invariants()` — re-verified live at HEAD: 86 = 64 LINEAR + 20 SAFETY_BFS + 2 LIVENESS_TLC). The 272 is the full corpus the S-5 lint now supervises; the largest contributors after `state_machines` (86): `chunkless_distribution_model` (17), `entitlement_model` (11), `merge_train_lifecycle` (10), `edit_application_ordering_model` (9).

### EXTRA Trace A2 — INV-18, the sole liveness invariant: a *different* mandated kind AND a second join (model → `.tla` text parity)

Labeled extra, per the verbosity directive. INV-18 exercises the *other* branch of hop 2 and adds a join Trace A does not have: the model **emits** a line of TLA+ and a BLOCKING lint asserts the `.tla` file on disk carries that exact line.

| Hop | Carrier | Value for INV-18 |
|---|---|---|
| 1 | `state_machines.py:1413-1436` | lanes `("job-completer","sweep-cron")`; `coord_primitive=STALE_READ_HEARTBEAT`; `temporal_form=(LEADS_TO, "Submitted ~> Terminal", "LIVE_EventualTerminal")` |
| 2 | `derive_verification_tier` `:557-558` | H1 ✓ ∧ H2 ✓, and `~>` **is** a liveness operator ⇒ **`LIVENESS_TLC`** |
| 4′ | `_DEFAULT_TIER_KIND_MAP` `:228` | `"LIVENESS_TLC" → "TLA_TLC"` |
| 5′ | `verify_refs` `:1446` | `VerifyRef(VerifyKind.TLA_TLC, "spec/INV18AsyncTermination.tla", "")` — file exists ✓ |
| 6′ | **second join** — model emits the property line | `temporal_form_to_tla_property` (`state_machines.py:580-608`) returns `"LIVE_EventualTerminal == Submitted ~> Terminal"` |
| 7′ | text-parity enforcement | `tools/lint/lint-tla-property-matches-model.py` parses the `.tla` for the `<name> == …` definition and asserts it EQUALS the model-generated line; registered BLOCKING (`batch_e.py:7343-7346`, `blocking=True, audit_only=False`) |

The `.tla` side of the join, verbatim (`spec/INV18AsyncTermination.tla:227`):

```tla
LIVE_EventualTerminal == Submitted ~> Terminal
```

The invariant's inline commentary (`state_machines.py:1404-1412`) states why the kind mandate differs: INV-18 is "a `P ~> Q` PROGRESS obligation over INFINITE behaviours: 'every submitted job EVENTUALLY reaches a terminal state.' No finite-trace BFS harness can falsify it — only TLC's liveness engine can." And the `.tla` is falsifiable, not decorative: it carries a `SweepCronOn=FALSE` toggle "whose TLC run finds a GENUINE liveness counterexample: a lost push strands the job forever when the sweep-cron is gone" (`:1441-1444`). So for INV-18 the join chain is: operator shape in the model → derived tier → mandated checker technology → cited `.tla` exists → **and the temporal property inside that `.tla` is byte-checked against the model's own emission** — the formula cannot drift from the fact that derived its tier.

### Trace B — one IAM edge: SyncEdge → deploy wiring → runtime identity → derived IAM grant → applied cloud configuration

The chosen edge, as requested: **accessibility-quality-service → genai-service** (the VLM judge/validate call path).

| Hop | What | Carrier (file:line) | Value for this edge |
|---|---|---|---|
| 1 | The typed edge + auth contract | `system-models/interservice_edges.py:344-352` (`SyncEdge`), `:319-326` (`_SOA_IAM_AUTH`), `:243-261` (`AuthContract.is_complete`) | caller/callee/`callee_url_env=ADA_TOOL_GENAI_SERVICE_URL`; `IAM_GATED_HTTPS` with `oidc_audience_is_callee_url=True ∧ invoker_grant_required=True` |
| 2 | The deploy-plane wiring literal | `deploy/cloud-run/generate_manifests.py:785-788` `DOWNSTREAM_URL_DEPS` | `"accessibility-quality-service": {"ADA_TOOL_GENAI_SERVICE_URL": "genai-service"}` — the literal every Cloud Run manifest env block is generated from |
| 3 | Model ⋈ literal (byte-parity) | `interservice_edges.py:829-849` `derive_downstream_url_deps`; pinned by `system-models/test_interservice_edges.py:40-45` (INV-ISC-X8) + `:48` (totality) | executed live at HEAD: **equal**, 6 callers / 28 edges |
| 4 | Runtime identity | `deploy/cloud-run/_env_runtime.py:90` `CloudRunEnvRuntime`, field `runtime_sa`; `runtime_for()` `:257` | `252097544507-compute@developer.gserviceaccount.com` (uniform single-project compute SA) |
| 5 | Derived grant plan (pure — no gcloud) | `deploy/cloud-run/deploy_cloudrun.py:707` `DownstreamInvokerGrant`, `:728-765` `downstream_invoker_grant_plan` | one `run.invoker` grant per model edge, deduped on `(member_sa, callee)`; env-scoped callee resolved in `build_grant_run_invoker_to_sa_argv` `:676` |
| 6 | Applied cloud configuration | `_grant_downstream_invokers` `:776`, invoked from the deploy driver at `deploy_cloudrun.py:3419` after the fleet deploy loop | idempotent `gcloud run services add-iam-policy-binding` per distinct binding; a manual revoke self-heals on the next deploy |

**Hop 1 — verbatim** (`system-models/interservice_edges.py`; line numbers at HEAD — this file gained 2 edges + X9 refinements since R1, all cites refreshed):

```python
# :319 — the standard SOA IAM-gated auth contract
_SOA_IAM_AUTH = AuthContract(
    transport=AuthTransport.IAM_GATED_HTTPS,
    oidc_audience_is_callee_url=True,
    invoker_grant_required=True,
    app_token=_SERVICE_APP_TOKEN,
)

# :344 — the edge record
SYNC_EDGES: tuple[SyncEdge, ...] = (
    # accessibility-quality-service → genai-service (VLM judge / validate path).
    SyncEdge(
        caller=ComponentName("accessibility-quality-service"),
        callee=ComponentName("genai-service"),
        callee_api=ApiEntityName("genai-service-complete"),
        callee_url_env=EnvVarName("ADA_TOOL_GENAI_SERVICE_URL"),   # ⟵ join key
        auth=_SOA_IAM_AUTH,
        url_seam=UrlSeam.DOWNSTREAM_URL_DEPS,
        expected_status=_SOA_STATUS_BASELINE,
    ),
```

and the semantic completeness predicate the M2 lint reads (`:255-261`) — note it is two-sided (a grant on a non-IAM edge is also a finding):

```python
    def is_complete(self) -> bool:
        """INV-ISC-M2 semantic completeness: an IAM-gated edge needs BOTH an OIDC
        audience rule AND an invoker grant (the gap-4+5 join). A non-IAM edge needs
        neither (an invoker grant on a CLUSTER_HTTP/PUBLIC_HTTPS edge is dead)."""
        if self.transport is AuthTransport.IAM_GATED_HTTPS:
            return self.oidc_audience_is_callee_url and self.invoker_grant_required
        return not self.invoker_grant_required
```

**Hop 3 — the parity join, executed live at HEAD:**

```
derive_downstream_url_deps() == DOWNSTREAM_URL_DEPS: True
callers: 6 ; edges: 28
  accessibility-conformance-service --[ADA_TOOL_VERAPDF_VALIDATOR_URL]--> verapdf-validator
  accessibility-quality-service --[ADA_TOOL_GENAI_SERVICE_URL]--> genai-service
  job-completer --[ADA_TOOL_A11Y_QUALITY_URL]--> accessibility-quality-service
  ... (25 more; callers: job-completer, job-introducer, worker, worker-chunkless)
```

The projection itself (`interservice_edges.py:829-849`, abridged docstring): "INV-ISC-X8 … asserts this byte-equals the live literal — the subsumption parity that proves the edge model can OWN the URL wiring without yet deleting the literal (the strangler retirement is a later phase)."

**Hops 4–6 — the grant plan, executed live at HEAD** (pure derivation, staging env runtime; no gcloud was invoked):

```
total grants (one per model edge, deduped per caller on callee): 28
  [APPLY  ] accessibility-conformance-service   -> verapdf-validator
  [APPLY  ] accessibility-quality-service       -> genai-service
  [APPLY  ] job-completer                       -> accessibility-quality-service
  [APPLY  ] job-completer                       -> audio-render-service
  [dedup->] job-completer                       -> genai-service
  ...
  [dedup->] worker-chunkless                    -> render-service
distinct (member_sa, callee) bindings applied: 10
member_sa (uniform runtime SA): 252097544507-compute@developer.gserviceaccount.com
sample argv: /opt/homebrew/bin/gcloud run services add-iam-policy-binding
  staging-verapdf-validator --project accessibility-assistant-jcd --region us-central1
  --member serviceAccount:252097544507-compute@developer.gserviceaccount.com
  --role roles/run.invoker --quiet
```

Two book-relevant details visible in that output: (a) **28 model edges collapse to 10 distinct IAM bindings** — the dedup on `(member_sa, callee)` is itself derived information neither source model holds; (b) the argv targets the **env-scoped** deployed name (`staging-verapdf-validator`) — resolved inside the sole-seam argv builder so "a caller passing the bare name cannot accidentally grant the wrong env's resource" (`deploy_cloudrun.py:691-693`).

The `DownstreamInvokerGrant` docstring (`deploy_cloudrun.py:709-717`) states the join thesis in the code's own words: "The URL wiring and this grant are the two halves of ONE edge; keeping them model-driven off the same SoT (never a bespoke per-edge grant) is A.6 defect-class consolidation." And `_grant_downstream_invokers` (`:776+`): "Runs AFTER the fleet deploy loop so the callee Cloud Run resource exists … Idempotent … so it self-heals a manual revoke on every deploy."

**The motivating incident, from the founding commit of the grant-derivation** (`905a81d6f8`, 2026-08-04, verbatim from the commit message):

> the worker→{render,ocr,lo,font,genai} URLs were wired (DOWNSTREAM_URL_DEPS['worker']) but no matching invoker grant existed, so the worker's runtime SA 403'd the DIRECT /render call at Cloud Run IAM (Auth failure → Session2 rollback → staging never green). Generalize the bespoke web→doc-edit grant pattern into a model-driven per-edge grant…

i.e. the two halves of the edge (URL wiring, IAM grant) had previously lived in two heads, and the un-joined half took staging down. The join is the fix's *form*.

### EXTRA Trace B2 — the third projection of the same edge set: model → Backstage catalog (INV-ISC-X9)

Labeled extra. The same `SYNC_EDGES` tuple is joined a third way: `tools/lint/lint-interservice-backstage-parity.py` (registered `batch_e.py:1183-1186`) asserts every modeled caller→callee edge appears in the Backstage catalog (`system-models/services/*.yaml`) under a deliberately three-representation join key — the caller's `consumesApis` (API grain) OR the caller's `dependsOn` (component grain) OR the callee's `expected-callers` inbound mirror. So one typed edge set drives **three enforced projections**: manifest env block (hop 2–3), IAM policy (hops 4–6), service catalog (this lint). This is the strongest compact statement of "models become useful by connection" the repo offers: add a service call without declaring the edge and the parity lints fire; declare it and the env var, the IAM binding, and the catalog entry are all *consequences*. (This lint is also where the post-R1 delta landed: the three 2026-09-22 squashes extended exactly this X9 leg and its tests — the joins are under active construction the very day of this response.)

---

## Item 5 — The exact before/after entitlement artifact (the lossy-scalar-reduction RCA, worked minimally)

Context anchor: RCA `docs/rca/purdue-institutional-upload-paywall-260824.md` (214 lines, added `f38a57ff04` 2026-08-24 15:16:28 -0400). Severity HIGH (prod): "a Purdue institutional-unlimited user (`test2@purdue.edu`) is blocked from the core feature (upload) by a 'Not enough credits — needs 38 credits … You have 0. Buy credits?' paywall."

### 5.1 The OLD fragment — the smallest verbatim implementation that performed the lossy reduction

Recovered from git history: this is the function DELETED by commit `8a0aeaa640` (2026-08-24 20:24:34 -0400, "feat(entitlement): delete get_credit_balances, re-source credit_balance from model — Phase 4/G-4 step 1/4"), quoted verbatim from that commit's deletion hunk in `web/persistence/billing.py`:

```python
def get_credit_balances(user_id: UserId) -> dict[str, Any]:
    """LEGACY shim for v1 callers — reads the user's groups.

    Returns ``{'credits': int, 'user_class': str, 'credits_seeded': bool}``
    where ``credits`` is the SUM of credit balances across non-unlimited
    groups. ``user_class`` is 'institutional' iff the user is in any
    institutional group with an unlimited mode, else 'individual'.
    """
    accts = db.list_user_groups(user_id)
    if not accts:
        return {"credits": 0, "user_class": "individual",
                "credits_seeded": False}
    credit_sum = sum(g.credit_balance for g in accts if not g.is_unlimited)
    has_inst = any(g.type == "institutional" for g in accts)
    has_unlimited = any(g.is_unlimited for g in accts)
    klass = "institutional" if (has_inst and has_unlimited) else "individual"
    return {"credits": credit_sum, "user_class": klass,
            "credits_seeded": True}
```

The single load-bearing line — the smallest fragment if one line is wanted — is:

```python
    credit_sum = sum(g.credit_balance for g in accts if not g.is_unlimited)
```

Note what the chapter can lean on: **the function reads `g.is_unlimited` twice.** The information was present, in hand, on the very lines that discarded it — `is_unlimited` is consulted to *exclude* unlimited groups from the sum (making a pure-unlimited user's scalar 0) and again to compute a *display* class string. The reduction to one scalar had no slot in its output type for "unlimited," so the distinction died at the return statement. This was never an information-availability bug; it was a *representation* bug.

### 5.2 The exact triggering entitlement state

From the RCA's reproduction (§3, which drives the REAL production functions: `billing.ensure_institutional_unlimited` → `billing.get_user_groups_summary`), the user's one group is:

```
type            = 'individual'        # the 260822 grant flips the user's PERSONAL group
is_unlimited    = True
unlimited_mode  = 'invoiced'
credit_balance  = 0                   # unlimited groups carry no finite balance
```

Trigger: uploading a **38-page `.pptx`** ⇒ `credits_for_pages(office, 38)` = **38 credits needed** (Office multiplier ×1).

### 5.3 The resulting WRONG decision (the production chain, from the RCA)

Old fragment on that state: `credit_sum = 0` (the only group is excluded by `not g.is_unlimited`); `klass = 'individual'` (`has_inst` is False — the unlimited group is the *personal* one). Production chain (RCA §8 v2 table, abridged): the SPA boots from `/api/auth/me` → `safe_user` → `credit_balance` **from `get_credit_balances` = 0**; `/api/auth/me` omits `groups[]`, so the client's group-aware path is empty and the preflight uses the top-level scalar: `0 < 38` → `showInsufficientTokensModal` — **the paywall, raised client-side before the file is ever POSTed**. The server's own gate (`reserve_with_draw_order`: `if grp.is_unlimited:` → `consume_unlimited` ledger row → ADMIT) was correct and never reached.

### 5.4 The NEW model input and the resulting CORRECT decision — executed live at HEAD

New representation: `system-models/entitlement_model.py` (601 lines; decision core `decide_admit` at `:307`). The input type keeps the distinction the scalar destroyed — `GroupEntitlement` (`:167`) carries `unlimited_mode` per group, and `is_unlimited` (`:230-234`) is "the SOLE unlimited-ness predicate (INV-ENT-5) … No site should re-derive this differently."

Live demonstration produced during this pass — the exact triggering state fed to both the old reduction (verbatim logic) and the new decider:

```
OLD get_credit_balances projection:
  credits=0  user_class='individual'
  client preflight: available 0 < needed 38 -> PAYWALL (showInsufficientTokensModal)

NEW decide_admit decision:
  admit=True  credits_needed=38
  drawn_group_id='grp-purdue-personal'  drawn_is_unlimited=True
  plan step: group=grp-purdue-personal outcome=admit_unlimited available=0 is_admit=True
  display_credit_balance=9007199254740991
  display_user_class='individual'
```

Three things in that output worth the chapter's ink:

1. **The decision is now a structure, not a scalar.** `AdmitDecision` carries `admit=True`, the paying group, and an ordered per-group `plan` whose step for this group reads `outcome=admit_unlimited` — the verdict is *explained* (R2/R5: unlimited ⇒ admit, short-circuit, no balance read; `decide_admit` `:340-348`).
2. **The display scalar still exists — but is typed as display-only and can no longer say 0 for an unlimited user.** `display_credit_balance` (`:394-405`) returns `DISPLAY_UNLIMITED_SENTINEL = 2**53 - 1` (`:391` — mirroring the client's `Number.MAX_SAFE_INTEGER` sentinel) whenever any group is unlimited. The module marks the boundary in its own §E header (`:372-386`): "the aggregate scalar is a DISPLAY projection, NOT an upload-sufficiency gate. The admit decision is `decide_admit` (per-group draw order), NEVER this scalar," and names its ancestor: "Its lossy `Σ credit_balance where not is_unlimited` contract WAS the D1 prod bug."
3. **The unchanged parts are pinned unchanged.** `display_user_class` (`:408-418`) still says `'individual'` for this state — "(A pure-unlimited *individual* group is still 'individual' — the 260824 case; this matched the old code and is preserved unchanged.)" The fix preserved every distinction the old code got right and restored only the one it destroyed.

The production consumer (`web/upload_credit_gate.py:229-231`) now delegates: `decision = em.decide_admit(ents, em.CreditFormat(_format_kind_raw), pages, prefer_personal=prefer_personal)` — with the site comment (`:199-201`): "the draw-order / cap / unlimited⇒admit POLICY is delegated to entitlement_model.decide_admit — the single authority." And the class is fenced against recurrence by a dedicated lint, `tools/lint/lint-entitlement-scalar-gate-allowlist.py` (verified present at HEAD), which scans `web/` for any new hand-rolled scalar answering the sufficiency question.

### 5.5 EXTRA — the same lossy-reduction class at a second site (the client), and why that matters

Labeled extra. The RCA's root-cause chain contains a *sibling* fragment in TypeScript — `web/static/spa/auth-and-billing-logic.ts:availableInGroup`, pre-fix (verbatim from RCA §2):

```ts
if (group.type === 'institutional') {
    if (typeof group.monthly_credits_remaining === 'number') return group.monthly_credits_remaining;
    return UNLIMITED_SENTINEL;      // ← sentinel ONLY for institutional
}
if (typeof group.credit_balance === 'number') return group.credit_balance;  // ← individual: literal 0
return null;
```

Same defect class, independently re-invented in a second runtime: the server emits `is_unlimited: true` on the individual group, and the client "consults NEITHER [`is_unlimited` nor `unlimited_mode`] for individual-typed groups" (RCA §2) — a projection to a number whose type has no unlimited slot. The RCA's v2 addendum then shows even the *fixed* helper was dead code on the production path (`/api/auth/me` omits `groups[]`, so the draw chain was empty and the top-level scalar — from `get_credit_balances` — decided). Two runtimes, two hand-rolled reductions, one class. That is precisely why the remediation was a *model*, not a patch: `entitlement_model.py` landed with a **cross-runtime parity corpus** (`system-models/entitlement_parity_corpus.json`, 201 lines; `web/test_entitlement_reproduce_pin.py`, 237 lines; `web/static/spa/test/auth-and-billing-logic.parity.test.ts`, 113 lines — all in the founding squash `14aa5f9813`), so the server decider and the client TypeScript are pinned to the same decision table, and the lint bars a third hand-rolled reduction. One representation choice, made once, enforced everywhere the question is asked.

### 5.6 EXTRA — the compressed timeline (all on 2026-08-24, from git)

| Time (EDT) | SHA | Event |
|---|---|---|
| 15:16:28 | `f38a57ff04` | RCA document lands (`docs/rca/purdue-institutional-upload-paywall-260824.md`) |
| 19:07:30 | `14aa5f9813` | `system-models/entitlement_model.py` **born** (395 lines) + property tests (381) + parity corpus (201) + corpus-shape lint + client parity test — the model, its checkers, and its guards land in ONE squash |
| 20:24:34 | `8a0aeaa640` | `get_credit_balances` **deleted**; display projections re-sourced from the model; "NO shim (A.7)" |
| next day | `1dc2a3b25f` | Epic `quota-entitlement-system-model` closed |

Incident to model-with-enforcement to old-code-deleted: **~5 hours**. For the factory chapter: this is what governance-conversion looks like at agent-fleet speed — the RCA did not produce a patch and a backlog ticket; it produced a typed decision authority, a cross-runtime parity corpus, a recurrence lint, and the deletion of the wrong representation, same day.

---

## Evolution evidence — the supervisory structure accumulated as engineering pressures appeared

Method: `git log --follow --diff-filter=A` for first appearance; founding-commit messages (verbatim where load-bearing) for the motivating pressure; landmark commits from each file's history. Nine artifacts (eight models + one model-consuming control), then two aggregate findings.

| # | Model | First commit / date | Motivating pressure (recovered from git/docs) | Subsequent significant revisions |
|---|---|---|---|---|
| 1 | **Chunk/job lifecycle SM** — now `web/jobtypes/statemachine.py` | `95e5cabb2e` **2026-04-19** ("feat: add explicit state machines to worker and coordinator") | A named prod bug, verbatim from the commit: "This fixes the counter drift bug where processing=2 stayed stuck after a chunked PPTX completed because on_job_completed didn't fire on the merge path." | `33a6502156` 04-22 typed enums replace ad-hoc strings; `56fc5eee41` 04-22 atomic test-and-set for an orphan-detector/worker race; `c8d98f4c77` 05-19 extracted to zero-I/O Layer-0 `web/jobtypes/`; `5b2ed49ca0` 09-14 `BATON_HANDOFF` state added (the absent-edge semantics R1 §30 featured). 24 commits total. |
| 2 | **Component-zone topology** — `system-models/components.py` | `cae1a3073c` **2026-05-17**, born as `tools/components.py` | Duplication pressure, verbatim: consolidates "tools/dev/run-cloc.py (was: inline 28-entry COMPONENTS list)" and "tools/agents/run-agent-audits.py (was: inline 24-entry ZONES list)" into one SoT. Founding census: 28 leaf / 4 group / 8 meta = 40 records. | `b0e2a6199c` 05-20 moved to `system-models/` ("system catalog belongs with system-models substrates" — the substrate is *named into existence* here); grown to **115 records (103 leaf / 6 group / 6 meta)** at HEAD (counted live). **266 commits** — by far the most-revised model; the map is maintained like territory. |
| 3 | **Composed cross-service SM + invariants** — `system-models/state_machines.py` | `3bd27b5b45` **2026-07-16** (uml-mbse Phase 2a: "6 SMs + 3 IPC seams + 12 invariants + 3 verified-protocol cite-entities … verification_tier DERIVED (§2a rule #57)") | The uml-mbse Epic: give context-bounded agents a typed concurrency map + derived verification obligations (rule #57 born here). | Invariant clusters accreted per-incident/Epic: `d94963f7d5` 07-25 INV-RC-1..8 (Redis comms); `369e9d2145` 07-26 INV-COST-1..6 money-conservation; `955c95c036` 08-03 INV-5 + scaler lane RETIRED with the GKE autoscaler (models also shed parts); `5f144e4da5` 08-04 S8 measurement-integrity invariants; `9045b4b633` 09-11 FILE_FLOCK coord-primitive added. **12 → 86 composed invariants** in ~9 weeks; 61 commits. |
| 4 | **Interservice call-contract model** — `system-models/interservice_edges.py` | `c1a88cac92` **2026-08-04** ("typed SyncEdge SoT + vocabulary … the per-edge AUTH contract (transport / OIDC-audience / invoker-grant / app-token)") | Same-day pressure pair: the ISC contract Epic design (260804) AND the worker→render IAM 403 that "stalled staging" (`905a81d6f8`, also 08-04 — see Trace B). The auth facet exists because the un-modeled half of an edge took an environment down. | `de23922606` same day: M1/M4 completeness + X9 Backstage-parity lints (AUDIT-ONLY-first, rule #55); edge set grown 26 → 28; three commits on **2026-09-22 (today)** extending X9 — 11 commits, still hot. |
| 5 | **Deploy-promote lifecycle** — `system-models/deploy_promote_lifecycle.py` | `9234197d30` **2026-08-04** ("promote-lifecycle model + model-plural rule-#57 lint") | The deploy-traffic-promote-convergence Epic; notable: landing this SECOND invariant-bearing model is what forced the tier lint to go **model-plural** (REVISE-6) — a model's arrival reshaped the control that supervises models. | 3 commits. |
| 6 | **Entitlement decision model** — `system-models/entitlement_model.py` | `14aa5f9813` **2026-08-24 19:07** | The same-day prod RCA (item 5 above): lossy scalar paywalled an institutional-unlimited user. Model + property tests + cross-runtime parity corpus + shape lint landed in the founding squash. | `8a0aeaa640` 20:24 same day: old reduction deleted, display projections re-sourced; `72f85deaa3`/`ba31df061f` same day: gate delegation (S10/S13); Epic closed 08-25; Sept: INV-ENT count now 11. 7 commits. |
| 7 | **Chunkless critical-path model** — `system-models/chunkless_critical_path_model.py` | `8685973b0f` **2026-08-30** | The worker-chunkless prod-graduation Epic: predict the pipeline's peak dispatch frontier (`peak_frontier_width`) rather than load-test-and-guess. | 8 commits; becomes the referenced owner of `frontier_width` for #8 (cross-model composition by reference, not copy). |
| 8 | **Worker peak-RSS budget** — `system-models/worker_rss_sizing_model.py` | `29d1368dfc` (inner `1eed38f392`) **2026-09-01** | Verbatim from the inner commit: "peak-RSS prediction M_pred = P(frontier_width, BSB streaming bound, P_dispatch, request-payload-inclusive GenAI term) + 30% safety-margin reserve (J-Q4 RATIFIED) … Constants are provenance-tagged CalibrationCell[int] (ESTIMATED priors pending C.4 idle-image calibration) … validate_conservative … a RUSAGE_SELF partial reading is REFUSED." The Cloud Run `--memory` flag becomes a model output with a falsifier. | 4 commits (calibration cells re-measured as the staging cgroup sweep landed). |
| 9 | **(control)** the S-5 tier lint — `tools/lint/lint-invariant-verification-tier.py` | `b8a7ccc025` **2026-07-16**, landed AUDIT-ONLY same day as #3 | Rule #57's enforcement gap, verbatim from the lint docstring: "the composed state-machine model already DERIVES a verification_tier per invariant … but nothing ENFORCES that each tier carries its mandated checker. This lint is that enforcement." | The documented demote→build→re-promote cycle (docstring `:49-62`): promoted after Phase-30 BFS checkers; demoted/re-promoted for C1, sidecar INV-PS-1, a11yvalidate INV-AV-6, model-redis INV-RC-6; went **model-plural** (REVISE-6) when model #5 arrived; now supervises **40 model modules / 272 invariants** (live count). 21 commits. |

### EXTRA evolution finding 1 — the accumulation curve of the model substrate itself

First-appearance month of every `system-models/*.py` file ever added (one `git log --diff-filter=A` pass over full history; includes since-deleted files):

```
2026-05 :  22 files     (substrate named; components.py + services/ move in)
2026-06 :  34 files
2026-07 :  51 files     (uml-mbse: the invariant/tier machinery lands)
2026-08 : 104 files     (peak: ISC edges, entitlement, chunkless family, promote-lifecycle)
2026-09 :  88 files     (through 09-22 — on pace to exceed August)
```

299 file-births in ~4.5 months, monotonically accelerating. Two qualitative inflections sit visibly in the curve: July's uml-mbse Epic (models gain *derived obligations* — rule #57), and August's incident cluster (three of the table's models — #4, #6, and the #5-adjacent grant plan — were each born within hours of a named production or staging failure).

### EXTRA evolution finding 2 — models predate the substrate, and started inside the product

The oldest model in the table (#1, 2026-04-19) is **product code** — an executable state machine born from a prod counter-drift bug, four weeks before `system-models/` existed. The evolutionary sequence recoverable from git is: (April) a model embedded in the product to kill a bug class → (May 17–20) a *named substrate* created by consolidating duplicated inline inventories, and existing catalogs moved into it ("system catalog belongs with system-models substrates," `b0e2a6199c`) → (July) models gain derived obligations and a supervising control → (August–September) new failures convert to models-plus-controls *by default*, same-day (item 5's five-hour RCA→model→deletion arc being the cleanest specimen). The supervisory structure was not designed in one act; each layer is date-stamped to the pressure that forced it — which is the empirical shape of "governance conversion / engineering capital" the chapter wants, and it is recoverable entirely from `git log`.

---

### Provenance appendix (for the figure captions)

- Response commit: `621c05852a` (2026-09-22); R1 baseline `3baabd775d` is an ancestor; delta touches only the interservice-edges/X9 files (all such cites refreshed here).
- Live executions performed for this response (read-only): the S-5 tier lint (exit 0); `derive_downstream_url_deps()` parity vs `DOWNSTREAM_URL_DEPS` (True; 6 callers/28 edges); `downstream_invoker_grant_plan(runtime_for('staging'))` (28 grants → 10 distinct bindings); the entitlement before/after demo (old logic: credits=0/paywall; `decide_admit`: admit_unlimited); model-plural invariant census (40 modules, 272 invariants; composed model 86 = 64/20/2, matching R1).
- Key SHAs quoted verbatim: `95e5cabb2e`, `cae1a3073c`, `b0e2a6199c`, `3bd27b5b45`, `b8a7ccc025`, `c1a88cac92`, `905a81d6f8`, `9234197d30`, `f38a57ff04`, `14aa5f9813`, `8a0aeaa640`, `1dc2a3b25f`, `29d1368dfc`/`1eed38f392`, `5b2ed49ca0`, `955c95c036`.

*End of R2-response-B. Items 4, 5, and the evolution addendum complete, each with labeled extras (A2 second invariant trace; B2 third projection; 5.5 client sibling fragment; 5.6 timeline; two aggregate evolution findings).*
