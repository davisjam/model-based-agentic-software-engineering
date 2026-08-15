<!--
PROVENANCE — field-note raw evidence (committed, NON-RENDERED).
Source draft: book/_design/drafts/formal-methods-mining-260815/ (gitignored working dir).
Home: book-models/field-note-sources/ — committed beside the field-note model, NOT under book/**,
so the catalog build's recursive book/**/*.md render glob does not pick it up (no orphan-reachability
gate applies). This is the durable evidence backing the formal-methods field-note entries in
book-models/field-notes.json (fn-db-cas-single-ownership, fn-lease-epoch-fencing, fn-inv18-liveness-gap),
consumed by book-models/substantiation.py as FieldNoteBacking. Model-registered evidence; not inline-cited.
-->

# E2E deep-dive — The in-flight LEASE fencing core

End-to-end reconstruction of the single fullest formal-methods chain in DocAble:
**engineering problem → behavioral model → invariants → TLA+ → TLC → implementation
correspondence → bounded model checking → authority**, with a concrete state trace.

Tags: **REPO-FACT** / **ENG-INTERP** / **MAGE-INTERP**. This is the protocol where
the chain is *complete and gating* — and where the load-bearing checker turns out to
be an executable Python BFS, not TLC.

---

## 1. Engineering problem

**REPO-FACT** (`lease-formal-verification-README.md:6-11`; `lease.tla:16-34`). A
parent job's *merge span* ("GAP-B") is long: it downloads all chunk outputs and runs
merge passes on large files. During it the pod can be preempted (Cloud Run `min=0`
recycle) or hang. A stale-lease reclaim must re-issue the work to another pod — but
**the original worker may still be alive** and fire a *late terminal clear on its old
lease*. Three failure classes live in the interleavings:

- **(a) split-brain double-terminal / stranded copy** — the late clear clobbers the
  re-issued lease of the requeued copy; the scaler's demand fold then reads 0 live
  leases and sleeps s2z while a job is *genuinely in flight* → the job silently never
  completes.
- **(b) duplicate remediation** — a reclaim requeues an already-terminal (DONE)
  parent → a second, redundant remediation run.
- **(c) the "r7 phantom" over-count** — a leaked lease on a DONE parent inflates the
  demand fold forever → the fleet *never* sleeps.

**ENG-INTERP.** "The correctness of a lease lives in the interleavings, not the happy
path." This is exactly the class ordinary example tests are weak on: the bug needs a
specific 3-way interleaving of reclaim / re-issue / late-clear with a *still-alive
original*.

---

## 2. Behavioral model

**REPO-FACT** (`lease.tla:56-107, 134`).

- **States** (`life : Jobs → LifeStates`): `QUEUED → CLAIMED → MERGING → DONE`, with
  `InFlight == {CLAIMED, MERGING}`.
- **State variables:** `lease[j]` (current epoch; `NoLease = 0`), `held[j]` (holder's
  snapshot epoch), `origLive[j]` / `origHeld[j]` (a reclaimed original worker still
  alive + its stale epoch), `leaseClears[j]` (count of clears that removed a lease —
  the split-brain *witness*), `clock` (bounded Nat), `sleeping`, `termRequeue`,
  `inBucket`.
- **Actions** (`Next`, `:239-247`): `Claim`, `Merge`, `TerminalClear` (epoch-CAS),
  `TerminalClearLeaks` (best-effort clear dropped), `OrigLateClear` (the split-brain
  hazard), `ReclaimOrphan` (fresh-epoch re-issue + PREEMPTION requeue),
  `ReclaimTerminalClear` (leaked lease on DONE → clear-only), `ReclaimTerminalRequeue`
  (falsifiability: requeue a DONE job = duplicate remediation), `ReconcileInflightLease`
  (F2/F3 scaler-tick clear of a leaked lease), `ScalerTickSleep`, `ScalerTickAwake`.
- **The fence** — `CasRemoves(cur, snap) == ~EpochFence \/ cur = snap` (`:134`): a
  clear removes the lease **iff** the clearer's snapshot epoch equals the current
  lease epoch, else the clear is a no-op.
- **Bounds:** `Jobs` = 2–3, `MaxClock` a few ticks, epochs ≤ `MaxClock + |Jobs| + 2`.
  Finite → BFS terminates and is genuinely exhaustive up to the bound; pinned by
  `test_enumeration_is_deterministic_and_bounded`.

**Repo↔model map** (`lease-formal-verification-README.md:59-71`, "Fencing-core →
source-of-truth map"):

| `.tla` action | runtime site |
|---|---|
| `Claim` | `web/job_introducer.py:_process_introducer_job` → `rq.acquire_inflight_lease` |
| `TerminalClear` | `web/job_completer.py:_release_lease_at_terminal` → `shared/lua/lease_release_cas.lua` |
| `ReclaimOrphan` / `ReclaimTerminalClear` | `web/job_completer.py:_reclaim_orphaned_leases` → `shared/lua/lease_reclaim_reissue.lua` |
| `ScalerTick*` demand fold | `web/scaler.py:get_queue_depth` |
| staleness threshold | `web/config.py:LEASE_STALE_SECONDS` |

---

## 3. Invariants (safety + liveness)

**REPO-FACT** (`lease.tla:256-319`; README table `:51-57`).

| Invariant | Formal (TLA+) | Plain English | Kind |
|---|---|---|---|
| `INV_Lease` | `GenuinelyInFlight ⇒ LiveLeaseCount ≥ 1` | demand fold ≥ 1 while a job is genuinely in flight (stale exempt) | safety |
| `INV_NoDoubleTerminal` | `∀j: leaseClears[j] ≤ 1` | the split-brain lease is cleared at most once (fence works) | safety |
| `INV_NoForeverLeak` | `~termRequeue` | a reclaim NEVER requeues an already-terminal parent | safety |
| `INV_TerminalNotRequeued` | `∀j: ~(life=DONE ∧ inBucket)` | a DONE job is never back in a queue bucket | safety |
| `LIVE_IdleEventuallySleeps` | `AllDoneNoLease ~> sleeping` | a genuinely-idle fleet eventually sleeps | liveness |
| `INV_NoPersistentOverCount` | `(OverCount>0) ~> (OverCount≤0)` | a leaked-lease phantom over-count never persists (F2/F3 reconcile) | liveness |

`FairSpec` (`:345`) conjoins `WF_vars(ScalerTickSleep)` + per-job
`WF_vars(ReconcileInflightLease)` so TLC can check the two temporal properties.

---

## 4. TLA+ specification

**REPO-FACT.** `docs/epics/closed/job-inflight-lease-accounting-260709/lease.tla`
(MODULE `lease`), authoritative despite living in a *closed-Epic* dir (it is the
live-referenced spec of `run-tlc.py`). `Init` at `:97`, `Next` at `:239`, `INV ==` at
`:289`. Falsifiability CONSTANTS `EpochFence`, `TerminalCheck`, `ReconcileEnabled`,
`BootLeaked` (`:38-51`). This faithfully adopts the TLA+ schema (Init / Next / actions
/ INVARIANT / temporal PROPERTY / WF fairness) — genre adoption per rule #22.

---

## 5. TLC checking

**REPO-FACT** (`tools/formal/run-tlc.py`; `tools/formal/tlc_invoker.py`;
`tools/formal/test_lease_tlc_e2e.py`).

- `run-tlc.py --green` runs `tools/formal/lease.cfg` and asserts **0 violations**.
- `run-tlc.py --falsify {epochfence|terminalcheck|reconcile}` runs the matching
  `lease-falsify-*.cfg` and asserts TLC **finds** the counterexample
  (`INV_NoDoubleTerminal` / `INV_NoForeverLeak` / `INV_NoPersistentOverCount`
  respectively) — the "teeth" (`run-tlc.py:88-93`).
- The argv is built only through the typed sole-seam `TlcInvoker` (`java -cp
  <tla2tools.jar> tlc2.TLC -config …`), rule #52; the dev-only jar is pinned in
  `tools/formal/tla_deps.py` (`v1.8.0`, SHA-256 pinned, fetched into gitignored
  `.cache/`, never committed, never in a prod image — `lint-no-tla2tools-in-prod-image.py`
  BLOCKING).
- **The crucial limit:** `run-tlc.py` **hardcodes `_LEASE_TLA`** (`:77-82`) → it runs
  `lease.tla` only. `test_lease_tlc_e2e.py` is the ONLY pytest that drives TLC and is
  `@pytest.mark.skipif(not _deps_available())` — **it SKIPs in the default dev/CI env
  because Java/`tla2tools.jar` is not installed there.** Nothing in `deploy/` invokes
  it and there is no `.github/workflows/`. Its own docstring: *"The Python BFS checker
  … remains the load-bearing, Java-free conformance gate."*

**ENG-INTERP.** TLC here is a *dev-only, belt-and-suspenders* sensor. It is real and
genuine when run, but it holds nothing in the workflow.

---

## 6. Implementation correspondence (the load-bearing move — NOT TLC)

**REPO-FACT** (`web/test_simworld/test_lease_model_check.py`;
`lease-formal-verification-README.md:16-57, 72-86`). Three independent representations
of the same invariant set exist:

1. **`lease.tla`** — the offline formal spec (§4).
2. **`_LeaseModel`** — a Python transition system the README states is a **"1:1
   mirror"** of the `.tla` actions. `enumerate_reachable` BFS-closes the whole
   reachable set (all interleavings up to the bound) and asserts the six invariants on
   *every* reachable state. This is an ordinary pytest → it runs in the unit tier →
   caught by the merge-train CI gate.
3. **The runtime** — `_reclaim_orphaned_leases`, `_release_lease_at_terminal`, the two
   Lua scripts, the scaler demand fold. `test_model_matches_runtime_*` drives the
   **real** introducer/completer/reclaim + real `lease_release_cas.lua` over a SimWorld
   (`fakeredis` + `FakeDb`) and asserts the observable lease state AGREES with the
   abstract model on the enumerated scenarios.

**What binds `.tla` ↔ Python ↔ runtime:** engineering intent + naming/ID lints, NOT
formal refinement. `test_lease_invariant_id_crosscheck.py` (BLOCKING pin) checks the
invariant IDs match across `.tla` and the Python checker;
`test_falsify_toggles_cover_all_three_guards` checks the toggle set ==
{epochfence, terminalcheck, reconcile} even without Java.

**Where human judgment enters (REPO-FACT + ENG-INTERP):** there is **no mechanized
proof that `lease.tla` `Spec` and `_LeaseModel` are semantically equal** — the "1:1
mirror" is a maintained-by-hand claim, guarded only by (a) invariant-ID equality and
(b) a re-check runbook (README `:88-134`) that fires *if a human notices a fencing-core
edit*. Edge 2 (`_LeaseModel` ⇄ runtime) is a finite set of example cross-checks, not a
proof of semantic equivalence over all states.

**Strongest defensible correspondence claim:** *a corresponding implementation-level
property is checked (via the SimWorld cross-checks), but there is no proof that the
abstract model and the implementation are semantically equivalent.* The abstract model
itself IS checked exhaustively (within bounds); its fidelity to the code rests on the
1:1-mirror discipline + cross-check tests + the re-check runbook.

---

## 7. Bounded model checking

**REPO-FACT.** The "bounded model checking" of this protocol is the
`enumerate_reachable` **explicit-state BFS over the abstract `_LeaseModel`** — NOT
CBMC / SAT / SMT (none exists in the repo). The bound is **actor/object counts + a
discrete clock** (Jobs 2–3, clock ~6), giving a finite reachable set the BFS exhausts.

Measured state spaces (README `:72-86`):

| configuration | reachable interleavings | violations |
|---|---|---|
| 2 parents / clock 6, both guards ON | **38,891** | 0 |
| 3 parents / clock 4, both guards ON | **177,717** | 0 |
| `EpochFence=FALSE` (fence off) | — | **4,184** `INV_NoDoubleTerminal` |
| `TerminalCheck=FALSE` | — | **18,258** duplicate-remediation |
| `ReconcileEnabled=FALSE` + boot-leak | — | the persistent-over-count sink (r7) |

**What it exposes:** interleaving races an example test cannot reliably hit —
reclaim / re-issue / late-clear split-brain, leaked-lease over-count, duplicate
remediation of a DONE parent.
**What it does NOT prove:** correctness beyond the bound (≥4 coupled parents); that
`fakeredis`/`FakeDb` semantics equal real Redis/Cloud-Tasks; a refinement between the
abstract model and the code; liveness in general (the BFS is a safety enumerator; the
two `~>` properties are checked by the offline TLC or approximated as terminal-sink
properties over the finite space).

---

## 8. Authority

**REPO-FACT.** The Python BFS checker is an ordinary `@pytest.mark.unit` test → runs
in the pre-deploy pytest gate and the merge-train full-CI gate → a violation **fails
the gate and blocks the batch**. The rule-#57 lint
`lint-invariant-verification-tier.py` (BLOCKING) additionally forces the lease's HAIRY
invariants to *have* a resolving SIMWORLD checker. The TLC e2e is advisory (SKIPs).
So: **the lease SAFETY invariants are authoritatively gated — by the Python checker;
the `.tla`/TLC layer is advisory documentation + an optional dev cross-check.**

**MAGE-INTERP.** *Modeling* = the lease/epoch-fence transition system. *Alignment* =
the checker is a **Validator** (hard, via the pytest gate); the tier lint a
**Gate/Constraint** (hard, BLOCKING); TLC a **Sensor** (soft, SKIPs). *Correspondence*
= model correctness (exhaustive BFS) + model↔implementation cross-check (real
Lua/completer, per-scenario), stopping short of refinement. *Engineering capital* =
"can a split-brain reclaim double-clear one job's lease?" is answered once by the
epoch-fence design and re-checked exhaustively every pre-deploy run.

---

## 9. Failure scenario — the split-brain double-terminal (state trace)

The actual protocol (`lease.tla` actions), the class the epoch fence was introduced to
forbid:

```
life=QUEUED, lease=NoLease
  │ Claim(j)          introducer wins QUEUED→REMEDIATING CAS, epoch e1
  ▼
life=CLAIMED, lease=e1, held=e1
  │ Merge(j)          parent enters GAP-B merge span
  ▼
life=MERGING, lease=e1, held=e1          worker-A hangs (no heartbeat)
  │ ReclaimOrphan(j)  completer sees stale lease → re-issue FRESH epoch e2,
  │                   PREEMPTION-requeue a COPY; worker-A still alive:
  │                   origLive=TRUE, origHeld=e1
  ▼
life=QUEUED, lease=e2, held=e2, origLive=TRUE, origHeld=e1
  │ Claim(j)          worker-B claims the requeued copy (epoch e2 already set)
  ▼
life=CLAIMED, lease=e2, held=e2, origLive=TRUE, origHeld=e1
  │ OrigLateClear(j)  worker-A finally finishes its OLD run and fires a
  │                   terminal clear on its stale epoch e1
  ▼
   ── WITH FENCE (EpochFence=TRUE):  CasRemoves(e2, e1) = FALSE → NO-OP.
      lease stays e2, leaseClears[j] = 0 → INV_NoDoubleTerminal HOLDS. ✓
   ── WITHOUT FENCE (EpochFence=FALSE): the clear removes lease e2.
      leaseClears[j] = 1, but worker-B is still in flight with NO live lease →
      demand fold reads 0 → scaler sleeps s2z → the requeued job is STRANDED
      (silent never-completes) → INV_NoDoubleTerminal VIOLATED, cascades to INV_Lease. ✗
```

- **Violated invariant:** `INV_NoDoubleTerminal` (`leaseClears[j] ≤ 1`), cascading to
  `INV_Lease`.
- **Does the exhaustive BFS expose it?** **Yes** — `epoch_fence=False` →
  `test_falsifiability_epoch_fence_off_finds_double_terminal` finds **4,184** violation
  states. **This is the actual gate.**
- **Does the runtime cross-check expose it?** Yes — `test_model_matches_runtime_split_brain_fence`
  drives the real `lease_release_cas.lua` (via `seed_stale_lease` +
  `reclaim_orphaned_leases`) and confirms the runtime fence matches the fenced model.
- **Does TLC expose it?** Yes in principle (`run-tlc.py --falsify epochfence`), but TLC
  is not run automatically (Java-gated SKIP).
- **Would ordinary tests?** Unlikely — it requires the specific
  Claim→Merge→ReclaimOrphan→Claim→OrigLateClear interleaving with a *still-alive
  original*. This is the "scenarios we didn't think of" case the phase was built for.
- **Durable engineering response:** the issue-epoch CAS fence
  (`shared/lua/lease_release_cas.lua`; a reclaim re-issues `max(existing)+1` via
  `lease_reclaim_reissue.lua`) + the exhaustive BFS checker + the `.tla` as documented
  spec + the re-check runbook.

---

## 10. One-line summary for the book

*The lease fencing core is DocAble's fullest formal chain — an explicit epoch-fenced
transition system with named safety + liveness invariants, an offline TLA+ spec, and a
falsifiability-toothed exhaustive checker that gates deploy — but the checker of record
is a Java-free Python BFS with real-runtime cross-checks, and the `.tla`↔model↔code
correspondence is a hand-maintained 1:1 mirror + naming lints, not a refinement.*
